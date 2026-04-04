import React, { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zwiggyx_cart') || '[]') }
    catch { return [] }
  })

  const [cartRestaurant, setCartRestaurant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zwiggyx_cart_restaurant') || 'null') }
    catch { return null }
  })

  useEffect(() => {
    localStorage.setItem('zwiggyx_cart', JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    if (cartRestaurant) localStorage.setItem('zwiggyx_cart_restaurant', JSON.stringify(cartRestaurant))
    else localStorage.removeItem('zwiggyx_cart_restaurant')
  }, [cartRestaurant])

  const addItem = (item, restaurant) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...item, quantity: 1 }]
    })
    if (!cartRestaurant) setCartRestaurant(restaurant)
  }

  const removeItem = (itemId) => {
    setCartItems(prev => {
      const updated = prev.filter(i => i.id !== itemId)
      if (updated.length === 0) setCartRestaurant(null)
      return updated
    })
  }

  const updateQuantity = (itemId, qty) => {
    if (qty <= 0) { removeItem(itemId); return }
    setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: qty } : i))
  }

  const clearCart = () => { setCartItems([]); setCartRestaurant(null) }

  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const itemCount  = cartItems.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider value={{ cartItems, cartRestaurant, addItem, removeItem, updateQuantity, clearCart, totalPrice, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
