import { SavedRecipesClient } from "./SavedRecipesClient";

export const metadata = {
  title: "My recipes",
  description: "Your locally-saved Poké Snacks and Aprijuices.",
};

export default function SavedRecipesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          My recipes
        </h1>
        <p className="text-sm text-muted mt-1">
          Locally saved snacks and juices. Stored in your browser only — clear
          your site data and they're gone.
        </p>
      </header>
      <SavedRecipesClient />
    </div>
  );
}
