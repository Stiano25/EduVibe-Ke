import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = ({ label, error, className = '', ...props }: InputProps) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-text-primary mb-3">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-5 py-4 text-base rounded-2xl
          bg-gray-50 text-text-primary placeholder:text-text-secondary
          focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white
          transition-all duration-200
          ${error ? 'ring-2 ring-red-500 bg-red-50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

