import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'sound-wave': {
  				'0%, 100%': {
  					height: '0.25rem'
  				},
  				'50%': {
  					height: '1rem'
  				}
  			},
  			'fade-out': {
  				'0%': {
  					opacity: '1'
  				},
  				'100%': {
  					opacity: '0'
  				}
  			},
  			'pulse-slow': {
  				'0%, 100%': {
  					transform: 'translate(-50%, -50%) scale(1)'
  				},
  				'50%': {
  					transform: 'translate(-50%, -50%) scale(1.05)'
  				}
  			},
  			'pulse-medium': {
  				'0%, 100%': {
  					transform: 'translate(-50%, -50%) scale(1)'
  				},
  				'50%': {
  					transform: 'translate(-50%, -50%) scale(1.08)'
  				}
  			},
  			'pulse-fast': {
  				'0%, 100%': {
  					transform: 'translate(-50%, -50%) scale(1)'
  				},
  				'50%': {
  					transform: 'translate(-50%, -50%) scale(1.1)'
  				}
  			},
  			'subtle-pulse': {
  				'0%, 100%': {
  					transform: 'scale(1)'
  				},
  				'50%': {
  					transform: 'scale(1.05)'
  				}
  			},
  			float: {
  				'0%': {
  					transform: 'translateY(0) rotate(0deg)'
  				},
  				'50%': {
  					transform: 'translateY(-20px) rotate(10deg)'
  				},
  				'100%': {
  					transform: 'translateY(0) rotate(0deg)'
  				}
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					opacity: '0.5',
  					filter: 'blur(10px)'
  				},
  				'50%': {
  					opacity: '0.8',
  					filter: 'blur(15px)'
  				}
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in 400ms ease-out',
  			'fade-out': 'fade-out 0.3s ease-out',
  			'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
  			'pulse-medium': 'pulse-medium 2.5s ease-in-out infinite',
  			'pulse-fast': 'pulse-fast 2s ease-in-out infinite',
  			'sound-wave': 'sound-wave 1.5s infinite ease-in-out',
  			'pulse-golden': 'pulse-golden 2s infinite',
  			'subtle-pulse': 'subtle-pulse 3s ease-in-out infinite',
  			float: 'float 6s ease-in-out infinite',
  			shimmer: 'shimmer 3s linear infinite',
  			'glow-pulse': 'glow-pulse 3s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
