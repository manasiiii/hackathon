// This file redirects to the compose tab
// Using a redirect ensures the compose screen is properly shown in the modal context

import { Redirect } from "expo-router";

export default function NewJournalRedirect() {
  return <Redirect href="/(tabs)/compose" />;
}
