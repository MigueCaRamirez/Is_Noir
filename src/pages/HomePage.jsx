import HeroSplit from '../components/HeroSplit'
import CollectionShowcase from '../components/CollectionShowcase'

export default function HomePage({ onExplore, onSelectCategory }) {
  return (
    <>
      <HeroSplit onExplore={onExplore} />
      <CollectionShowcase onSelectCategory={onSelectCategory} />
    </>
  )
}
