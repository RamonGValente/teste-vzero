/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        // Animação para a mensagem "apagada"
        'fade-out-in': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' }, // Mais suave
        },
      },
      animation: {
        'fade-out-in': 'fade-out-in 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}