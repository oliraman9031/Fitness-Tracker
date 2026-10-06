import React, { useState } from "react";
import { searchFoods } from "../../services/foodApi";

function FoodSearch({ onResults }) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searched, setSearched] = useState(false);
    const [noResults, setNoResults] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        const searchTerm = query.trim();
        if (!searchTerm) {
            setError("Enter a food to search.");
            onResults([]);
            setSearched(false);
            setNoResults(false);
            return;
        }

        setLoading(true);
        setError("");
        setSearched(true);
        try {
            const matches = await searchFoods(searchTerm);
            onResults(matches);
            setNoResults(matches.length === 0);
        } catch (requestError) {
            setError(requestError.message);
            onResults([]);
            setNoResults(false);
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h2 className="text-xl font-semibold text-white">Search USDA foods</h2>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="food-search">Search food</label>
                <input
                    id="food-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search foods, e.g. chicken"
                    className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60"
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </form>
            {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
            {searched && !loading && !error && (
                <p className="mt-3 text-sm text-slate-400">
                    {noResults ? "No foods found. Try another search." : "Search results are shown below."}
                </p>
            )}
        </section>
    );
}

export default FoodSearch;
