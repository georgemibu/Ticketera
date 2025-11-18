import React from 'react';
import { Link } from 'react-router-dom';

const CancelPage = () => {
  return (
    <div>
      <h1>Compra Cancelada</h1>
      <p>El proceso de pago fue cancelado o falló.</p>
      <Link to="/">
        <button>Volver a intentarlo</button>
      </Link>
    </div>
  );
};

export default CancelPage;
