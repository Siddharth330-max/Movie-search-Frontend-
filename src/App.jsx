// src/App.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";

// ---------------- CONFIG ----------------
const TMDB_API_KEY = "d0ab92489714b168ba7388c5168350d4"; // <-- API key from TMDB website
const TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const PLACEHOLDER_POSTER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='750'><rect width='100%' height='100%' fill='%23222'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23bbb' font-family='Arial' font-size='24'>No+Image</text></svg>";

// ---------------- Helper Function ----------------
async function fetchMovies(query, page = 1) {
  if (!query) return { results: [], page: 1, total_pages: 1 };
  const url = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    query
  )}&page=${page}&include_adult=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed fetching movies");
  return res.json();
}

// ---------------- Movie Card Component ----------------
function MovieCard({ movie }) {
  const poster = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : PLACEHOLDER_POSTER;

  return (
    <article className="bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-2xl overflow-hidden shadow-md hover:scale-[1.01] transition-transform duration-150">
      <img
        src={poster}
        alt={movie.title}
        loading="lazy"
        className="w-full h-80 object-cover"
        onError={(e) => {
          e.currentTarget.src = PLACEHOLDER_POSTER;
        }}
      />
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2">{movie.title}</h3>
        <div className="mt-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
          <span>
            ⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : "—"}
          </span>
          <span>
            {movie.release_date
              ? new Date(movie.release_date).getFullYear()
              : "—"}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-200 line-clamp-3">
          {movie.overview || "No description available."}
        </p>
      </div>
    </article>
  );
}

// ---------------- Main App ----------------
export default function App() {
  const [query, setQuery] = useState("");
  const [displayQuery, setDisplayQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
    return false;
  });

  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Theme handling
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("movieapp:dark", dark ? "1" : "0");
    } catch (e) {}
  }, [dark]);

  useEffect(() => {
    try {
      const val = localStorage.getItem("movieapp:dark");
      if (val !== null) setDark(val === "1");
    } catch (e) {}
  }, []);

  // Fetch movies
  useEffect(() => {
    let aborted = false;
    async function load() {
      if (!displayQuery) {
        setMovies([]);
        setPage(1);
        setTotalPages(1);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const json = await fetchMovies(displayQuery, page);
        if (aborted) return;
        if (page === 1) setMovies(json.results || []);
        else setMovies((prev) => [...prev, ...(json.results || [])]);
        setTotalPages(json.total_pages || 1);
      } catch (err) {
        if (!aborted) setError(err.message || "Unknown error");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [displayQuery, page]);

  // Infinite scroll
  const handleIntersect = useCallback(
    (entries) => {
      const e = entries[0];
      if (e.isIntersecting && !loading && page < totalPages) {
        setPage((p) => p + 1);
      }
    },
    [loading, page, totalPages]
  );

  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    });
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current && observerRef.current.disconnect();
  }, [handleIntersect]);

  function submitSearch(e) {
    e && e.preventDefault();
    if (!query.trim()) {
      setDisplayQuery("");
      setMovies([]);
      setPage(1);
      setTotalPages(1);
      return;
    }
    setDisplayQuery(query.trim());
    setPage(1);
  }

  function clearSearch() {
    setQuery("");
    setDisplayQuery("");
    setMovies([]);
    setPage(1);
    setTotalPages(1);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Header */}
      <header className="max-w-6xl mx-auto p-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Movie Search</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Search movies powered by TMDB • Posters, ratings, descriptions •
            Infinite scroll
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 hover:scale-105 transition-transform"
          >
            {dark ? "🌙 Dark" : "🌤️ Light"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 pb-20">
        <form onSubmit={submitSearch} className="flex gap-3 items-center mb-6">
          <input
            id="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies by name (e.g. Inception)"
            className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearSearch}
              className="px-4 py-2 rounded-xl border"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Results */}
        <section>
          {displayQuery ? (
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Showing results for <strong>"{displayQuery}"</strong>
            </p>
          ) : (
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
              Type a movie name and press Search.
            </p>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>

          <div ref={sentinelRef} className="h-6 mt-8"></div>

          <div className="mt-6 flex items-center justify-center">
            {loading && <div className="text-sm">Loading...</div>}
            {!loading && movies.length === 0 && displayQuery && (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                No results found.
              </div>
            )}
          </div>
        </section>

        <footer className="mt-16 text-center text-xs text-slate-500 dark:text-slate-400">
          Data from The Movie Database (TMDB) • Demo app
        </footer>
      </main>
    </div>
  );
}
