import { ArrowRight } from 'lucide-react'
import { StoryBand } from '../components/EditorialStory'
import { Butterfly } from '../components/Logo'

const VALUES = [
  {
    index: '01',
    title: 'Curaduría con intención',
    text: 'Cada pieza entra al atelier por su historia, su textura y su capacidad de perdurar.',
  },
  {
    index: '02',
    title: 'Dos estilos, un universo',
    text: 'La serenidad de Old Money y la actitud de Alternativo conviven sin pedir permiso.',
  },
  {
    index: '03',
    title: 'Atención directa',
    text: 'Cada pedido se conversa y se confirma contigo por WhatsApp, de principio a fin.',
  },
]

export default function AboutPage({ onExplore }) {
  return (
    <div className="page page--about">
      <section className="about-intro" aria-labelledby="about-title">
        <Butterfly className="about-intro__butterfly" />
        <div className="container-wide about-intro__inner">
          <div>
            <span className="eyebrow eyebrow--rule">Sobre nosotros</span>
            <h1 id="about-title" className="about-intro__title">
              El atelier detrás
              <br />
              <em>de IS NOIR</em>
            </h1>
          </div>
          <div className="about-intro__copy">
            <p>
              IS NOIR nace en Cúcuta de la mezcla de dos formas de habitar el
              estilo: la serenidad de Old Money y la actitud de Alternativo.
            </p>
            <p>
              Seleccionamos ropa y accesorios con carácter, piezas que se sienten
              bien, perduran y acompañan cada versión de ti.
            </p>
            <span className="about-intro__signature">IS NOIR · Cúcuta</span>
          </div>
        </div>
      </section>

      <StoryBand onExplore={onExplore} />

      <section className="about-values" aria-labelledby="about-values-title">
        <div className="container-wide">
          <div className="about-values__head">
            <div>
              <span className="eyebrow eyebrow--rule">Lo que nos mueve</span>
              <h2 id="about-values-title" className="section-title">
                Menos ruido, más intención.
              </h2>
            </div>
            <p>
              Un atelier pequeño, una mirada cuidadosa y una forma directa de
              acompañarte.
            </p>
          </div>

          <div className="about-values__grid">
            {VALUES.map((value) => (
              <article key={value.index} className="about-value">
                <span className="about-value__index">{value.index}</span>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-cta">
        <div className="container-wide">
          <span className="eyebrow">La colección te espera</span>
          <h2>Encuentra tu próxima pieza.</h2>
          <button type="button" className="button-primary" onClick={onExplore}>
            Explorar la colección
            <ArrowRight size={16} strokeWidth={1.4} />
          </button>
        </div>
      </section>
    </div>
  )
}
