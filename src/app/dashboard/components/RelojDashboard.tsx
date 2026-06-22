'use client';

import { useState, useEffect } from 'react';

export default function RelojDashboard() {
  const [fechaHora, setFechaHora] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setFechaHora(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="reloj-dashboard">
      <div className="reloj-hora">
        {fechaHora.toLocaleTimeString('es-CL', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })}
      </div>
      <div className="reloj-fecha">
        {fechaHora.toLocaleDateString('es-CL', { 
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })}
      </div>
    </div>
  );
}
