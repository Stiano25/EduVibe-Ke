import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarProps {
  onDateSelect?: (date: Date) => void
}

export const Calendar = ({ onDateSelect }: CalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December']
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }
  
  const days = getDaysInMonth(currentDate)
  const today = new Date()
  const isToday = (day: number | null) => {
    if (!day) return false
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }
  
  return (
    <div className="bento-card bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-text-primary">Schedule Calendar</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-text-secondary" strokeWidth={2.5} />
          </button>
          <button 
            onClick={nextMonth}
            className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-text-secondary" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      
      <button className="w-full px-3 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-semibold mb-4 hover:bg-primary-100 transition-colors">
        {monthNames[currentDate.getMonth()]}
      </button>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-text-secondary py-1">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            onClick={() => day && onDateSelect?.(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
            className={`
              aspect-square rounded-lg text-xs font-medium transition-all duration-200
              ${!day ? 'cursor-default' : 'hover:bg-primary-50 cursor-pointer'}
              ${isToday(day) 
                ? 'bg-secondary-500 text-white hover:bg-secondary-600' 
                : day 
                  ? 'text-text-primary hover:text-primary-600' 
                  : 'text-transparent'
              }
            `}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  )
}

