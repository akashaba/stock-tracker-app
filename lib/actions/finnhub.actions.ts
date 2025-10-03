"use server";


import {formatArticle, getDateRange, validateArticle} from "@/lib/utils";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const NEXT_PUBLIC_FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";



/**
 * Helper to perform fetch and parse JSON with Next.js caching options.
 */
export async function fetchJSON<T>(url: string, revalidateSeconds?: number): Promise<T> {
    const init: RequestInit & { next?: { revalidate: number } } = revalidateSeconds
        ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
        : { cache: "no-store" };

    const res = await fetch(url, init);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to fetch ${url}. Status ${res.status}. ${text}`);
    }
    return (await res.json()) as T;
}

/**
 * Fetch news for given symbols (company-news) or general market news if no symbols provided.
 * - Max 6 articles returned
 * - Round-robin across symbols (max 6 rounds)
 */
export async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
    try {
        const range = getDateRange(5);
        const token = NEXT_PUBLIC_FINNHUB_API_KEY;

        const cleanSymbols = (symbols || [])
            .map((s) => s?.trim().toUpperCase())
            .filter((s): s is string => Boolean(s));

        const maxArticles = 6;


        if (cleanSymbols.length > 0) {
            const perSymbolArticles: Record<string, RawNewsArticle[]>={}
            await Promise.all(
                cleanSymbols.map(async (sym) =>{
                    try {
                        const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(sym)}&from=${range.from}&to=${range.to}&token=${token}`;
                        const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
                        perSymbolArticles[sym] = (articles || []).filter(validateArticle)
                    }catch(err) {
                        console.error('error fetching company news for', sym, err);
                        perSymbolArticles[sym]=[];
                    }
                })
            );

            const collected: MarketNewsArticle[] =[];
            for (let round=0; round<maxArticles; round++) {
                for (let i=0; i<cleanSymbols.length; i++) {
                    const sym = cleanSymbols[i];
                    const list = perSymbolArticles[sym] ||[];
                    if (list.length === 0) continue;
                    const article = list.shift();
                    if (!article || !validateArticle(article)) continue;
                    collected.push(formatArticle(article, true, sym, round));
                    if (collected.length >= maxArticles) break;
                }
                if(collected.length>=maxArticles) break;
            }

            if (collected.length >0) {
                collected.sort((a, b) => (b.datetime ||0) - (a.datetime ||0))
                return collected.slice(0, maxArticles);
            }
        }

        const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
        const general = await fetchJSON<RawNewsArticle[]>(generalUrl, 300);

        const seen = new Set<string>();
        const unique: RawNewsArticle[] = [];
        for (const art of general || []) {
            if (!validateArticle(art)) continue;
            const key = `${art.id}-${art.url}-${art.headline}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(art);
            if (unique.length >= 20) break;
        }

        const formatted = unique.slice(0, maxArticles).map((a, idx) => formatArticle(a, false, undefined, idx));
        return formatted;

    } catch (error) {
        console.error('Get news error',error);
        throw new Error("Failed to fetch news");
    }
}
