import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <div className="relative mb-4 flex justify-center">
      <div className="w-full max-w-md relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" strokeWidth={2.5} />
        <input
          type="text"
          placeholder="Search lessons..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3 text-sm rounded-[32px] bg-white/70 backdrop-blur-md border-2 border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-text-secondary/60 outline-none font-medium"
          style={{ fontFamily: 'Fredoka, sans-serif' }}
        />
      </div>
    </div>
  )
}







