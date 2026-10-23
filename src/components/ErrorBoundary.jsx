import { Component } from 'react'
import { Home, RefreshCw } from 'lucide-react'
import { Butterfly } from './Logo'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // El detalle queda solo en la consola del equipo; la clienta nunca lo ve.
    console.error('IS NOIR · error de interfaz', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="error-fallback" role="alert">
        <span className="error-fallback__butterfly" aria-hidden="true">
          <Butterfly />
        </span>
        <span className="eyebrow eyebrow--rule">IS NOIR</span>
        <h1>La maison está tomando un respiro.</h1>
        <p>
          Algo interrumpió la experiencia por un instante. Tus piezas siguen aquí:
          vuelve a intentarlo y te esperamos.
        </p>
        <div className="error-fallback__actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} strokeWidth={1.4} />
            Volver a intentar
          </button>
          <a className="button-outline" href="/">
            <Home size={15} strokeWidth={1.4} />
            Ir al inicio
          </a>
        </div>
        <small>Si el problema continúa, escríbenos por WhatsApp.</small>
      </main>
    )
  }
}
