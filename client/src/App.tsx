import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const Walkthrough = lazy(() => import("./pages/Walkthrough"));
// development-only: deterministic renderer used to produce the hero film frames
const FilmRig = import.meta.env.DEV ? lazy(() => import("./pages/FilmRig")) : null;

// NOTE: About pages
// - When the app has many pages, lazy-load them instead of importing each one above:
//   `const Foo = lazy(() => import("./pages/Foo"))`, and wrap `<Switch>` in `<Suspense>`
// - A page imported above is fetched on every load, and Preview requests each source file
//   separately, so the number of requests grows with the number of pages

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#07080b]" aria-busy="true" />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/walkthrough"} component={Walkthrough} />
        {FilmRig && <Route path={"/__film"} component={FilmRig} />}
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
