import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SuccessPage = () => {
  const [tickets, setTickets] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const sessionId = new URLSearchParams(location.search).get('session_id');

    if (!sessionId) {
      setError('No se encontró el ID de la sesión.');
      setLoading(false);
      return;
    }

    const fetchTicketData = async () => {
      try {
        const response = await fetch(`http://localhost:4000/api/orders/by-session/${sessionId}`);
        
        if (response.status === 202) {
          // El webhook todavía se está procesando, reintentar después de un momento
          setTimeout(fetchTicketData, 2000);
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al cargar los datos de la orden.');
        }

        const data = await response.json();
        setTickets(data.tickets);
        setEmail(data.email);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [location.search]);

  if (loading) {
    return <div><h1>Procesando tu compra...</h1><p>Estamos generando tus entradas. ¡Gracias por tu paciencia!</p></div>;
  }

  if (error) {
    return <div><h1>Error</h1><p>{error}</p></div>;
  }

  return (
    <div>
      <h1>¡Compra Exitosa!</h1>
      <p>Gracias por tu compra, {email}.</p>
      <p>Aquí están tus entradas. Te recomendamos hacer una captura de pantalla o guardarlas.</p>
      
      <div style={{ marginTop: '2rem' }}>
        {tickets.map(ticket => (
          <div key={ticket.id} style={{ marginBottom: '2rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
            <h3>Entrada</h3>
            <img src={ticket.qr_url} alt={`QR Code for ticket ${ticket.ticket_code}`} />
            <p>Código: <code>{ticket.ticket_code}</code></p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuccessPage;
