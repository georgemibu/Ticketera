import React, { useState } from 'react';

const EventPage = () => {
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (paymentMethod) => {
    if (!email) {
      alert('Por favor, introduce tu email.');
      return;
    }
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch('http://localhost:4000/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, quantity, paymentMethod }),
      });

      if (!response.ok) {
        throw new Error('La respuesta del servidor no fue OK');
      }

      const { checkoutUrl } = await response.json();

      // Redirigir al usuario a la URL de checkout
      window.location.href = checkoutUrl;

    } catch (error) {
      console.error('Error al crear la sesión de checkout:', error);
      alert('Hubo un error al intentar procesar el pago. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Evento Increíble</h1>
      <img src="https://via.placeholder.com/400x200" alt="Banner del evento" style={{ maxWidth: '100%', borderRadius: '8px' }} />
      <p>Fecha: 25 de Diciembre, 2025</p>
      <p>Precio: 5000 ARS</p>
      
      <div style={{ margin: '2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <div>
          <label htmlFor="email" style={{ marginRight: '1rem' }}>Email:</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={{ width: '200px' }}
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="quantity" style={{ marginRight: '1rem' }}>Cantidad:</label>
          <input 
            type="number" 
            id="quantity" 
            name="quantity" 
            min="1" 
            max="10" 
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            style={{ width: '60px' }}
            disabled={loading}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => handleCheckout('stripe')} disabled={loading} style={{ padding: '10px 20px', fontSize: '1rem', cursor: 'pointer' }}>
          {loading ? 'Procesando...' : 'Pagar con Tarjeta'}
        </button>
        <button onClick={() => handleCheckout('mercadopago')} disabled={loading} style={{ padding: '10px 20px', fontSize: '1rem', cursor: 'pointer' }}>
          {loading ? 'Procesando...' : 'Pagar con Mercado Pago'}
        </button>
      </div>
    </div>
  );
};

export default EventPage;
