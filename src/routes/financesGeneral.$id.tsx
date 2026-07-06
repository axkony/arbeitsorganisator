import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financesGeneral/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/financesGeneral/$id"!</div>
}
