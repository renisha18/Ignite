import { useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import ComingSoon from "./ComingSoon";

// Skeleton. Will call eventService.getEventById(eventId) and
// applicationService.applyToEvent(eventId, { preferredRoleId, motivation }).
//
// Not a sidebar item — reached from Browse Events.
export default function EventDetails() {
  const { eventId } = useParams();

  return (
    <>
      <PageHeader
        title="Event Details"
        subtitle={eventId ? `Event #${eventId}` : undefined}
      />
      <ComingSoon note="Event description, roles with remaining capacity, and the apply form." />
    </>
  );
}
