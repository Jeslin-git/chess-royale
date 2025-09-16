import { GameState } from '../types/chess';

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;

export async function fetchGif(eventTag: string): Promise<string | null> {
    if (!GIPHY_API_KEY) {
        console.warn('Giphy API key not configured.');
        return null;
    }

    const encodedTag = encodeURIComponent(eventTag);
    const url = `https://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=${encodedTag}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.data && data.data.images) {
            return data.data.images.fixed_height.url;
        }
        return null;
    } catch (error) {
        console.error('Error fetching GIF from Giphy:', error);
        return null;
    }
}