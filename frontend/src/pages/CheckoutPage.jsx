import React, { useState, useEffect } from 'react';

const CheckoutPage = () => {
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');

  const handleCheckout = async (paymentMethod) => {
    if (!email) {
      alert('Por favor, introduce tu email.');
      return;
    }
    if (loading) return;

    setLoading(true);

    try {
      const body = { email, quantity, paymentMethod };
      if (selectedEventId) body.eventId = selectedEventId;

      const response = await fetch('http://localhost:4000/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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

  useEffect(() => {
    let mounted = true;
    async function loadEvents() {
      try {
        const res = await fetch('http://localhost:4000/api/events');
        if (!res.ok) throw new Error('Failed to load events');
        const data = await res.json();
        if (mounted) {
          setEvents(data);
          if (data.length > 0) setSelectedEventId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    }
    loadEvents();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h1 style={styles.title}>Comprar Entrada</h1>
        
        <div style={styles.formGroup}>
          <label htmlFor="event" style={styles.label}>Evento:</label>
          <select
            id="event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={styles.input}
            disabled={loading}
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title} — {new Date(ev.date).toLocaleString()}</option>
            ))}
          </select>

          <label htmlFor="email" style={styles.label}>Email:</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={styles.input}
            disabled={loading}
          />
        </div>

        <div style={styles.formGroup}>
          <label htmlFor="quantity" style={styles.label}>Cantidad:</label>
          <input 
            type="number" 
            id="quantity" 
            name="quantity" 
            min="1" 
            max="10" 
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            style={styles.input}
            disabled={loading}
          />
        </div>

        <div style={styles.priceInfo}>
          <p>Precio por entrada: $1.000 ARS</p>
          <p style={styles.total}>Total: ${(quantity * 1000).toLocaleString()} ARS</p>
        </div>

        <div style={styles.buttonGroup}>
          <button 
            onClick={() => handleCheckout('stripe')} 
            disabled={loading} 
            style={{...styles.button, backgroundColor: '#007bff'}}
          >
            {loading ? 'Procesando...' : 'Pagar con Tarjeta'}
          </button>
          <button 
            onClick={() => handleCheckout('mercadopago')} 
            disabled={loading} 
            style={{...styles.button, backgroundColor: '#0066cc'}}
          >
            {loading ? 'Procesando...' : 'Pagar con Mercado Pago'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: '30px',
    color: '#333',
    fontSize: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#555',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  priceInfo: {
    backgroundColor: '#f0f0f0',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#666',
  },
  total: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginTop: '10px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  button: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.3s ease',
  },
};

export default CheckoutPage;
