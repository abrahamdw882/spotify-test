const proxyUrl = "https://ab-proxy1.abrahamdw882.workers.dev/?u=";

async function fetchWithRetry(url, options = {}, retries = 5, backoff = 500) {
    let attempt = 0;
    while (attempt < retries || retries === -1) { 
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); 

            console.log(`Attempt ${attempt + 1} - Fetching: ${url}`);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            console.log(`Success after ${attempt + 1} attempts.`);
            return response;
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
            attempt++;

            if (retries !== -1 && attempt >= retries) {
                console.error("Max retries reached. Request failed.");
                throw error;
            }

            const delay = backoff * attempt;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function fetchThumbnail(songUrl) {
    const apiUrl = `https://api.giftedtech.my.id/api/download/spotifydl2?apikey=_0x5aff35,_0x1876stqr&url=${encodeURIComponent(songUrl)}`;
    try {
        const response = await fetchWithRetry(proxyUrl + encodeURIComponent(apiUrl), {}, -1);
        const data = await response.json();
        if (data.success && data.result && data.result.thumbnail) {
            return data.result.thumbnail;
        } else {
            return 'https://via.placeholder.com/150';
        }
    } catch (error) {
        console.error("Error fetching thumbnail:", error);
        return 'https://via.placeholder.com/150';
    }
}

async function fetchVideos() {
    const query = document.getElementById("searchQuery").value;
    const resultsContainer = document.getElementById("results");
    const loadingDiv = document.getElementById("loading");
    resultsContainer.innerHTML = "";

    if (!query) {
        resultsContainer.innerHTML = "<p>Please enter a search query.</p>";
        return;
    }

    loadingDiv.classList.remove("hidden");

    try {
        const apiUrl = `https://api.giftedtech.my.id/api/search/spotifysearch?apikey=_0x5aff35,_0x1876stqr&query=${encodeURIComponent(query)}`;
        const response = await fetchWithRetry(proxyUrl + encodeURIComponent(apiUrl), {}, -1);
        const data = await response.json();

        if (!data.success || !data.results.length) {
            resultsContainer.innerHTML = "<p>No results found.</p>";
            return;
        }

        for (const song of data.results) {
            const thumbnailUrl = await fetchThumbnail(song.url);

            const videoCard = document.createElement("li");
            videoCard.classList.add("video-card");

            videoCard.innerHTML = `
                <img src="${thumbnailUrl}" alt="${song.title}">
                <div class="video-info">
                    <h3><a href="${song.url}" target="_blank">${song.title}</a></h3>
                    <p>Artist: ${song.artist}</p>
                    <p>Duration: ${song.duration}</p>
                    <button class="download-button" onclick="fetchDownloadLinks(this, '${song.url}')">Download</button>
                    <div class="download-section" id="download-${song.url}" style="display: none;"></div>
                </div>
            `;

            resultsContainer.appendChild(videoCard);
        }
    } catch (error) {
        resultsContainer.innerHTML = `<p>Failed to fetch results. Please try again later.</p>`;
        console.error(error);
    } finally {
        loadingDiv.classList.add("hidden");
    }
}

async function fetchDownloadLinks(button, songUrl) {
    const originalText = button.innerText;
    button.disabled = true;

    let dots = "";
    const loadingInterval = setInterval(() => {
        dots = dots.length < 4 ? dots + "." : "";
        button.innerText = `📀Loading${dots}`;
    }, 500);

    const downloadSection = document.getElementById(`download-${songUrl}`);
    downloadSection.innerHTML = "";
    downloadSection.style.display = "block";

    try {
        const apiUrl = `https://api.giftedtech.my.id/api/download/spotifydl?apikey=_0x5aff35,_0x1876stqr&url=${encodeURIComponent(songUrl)}`;
        const response = await fetchWithRetry(proxyUrl + encodeURIComponent(apiUrl), {}, -1);
        const data = await response.json();

        if (data.success && data.result?.download_url) {
            const audioDownloadButton = document.createElement("a");
            audioDownloadButton.classList.add("download-button");
            audioDownloadButton.href = data.result.download_url;
            audioDownloadButton.target = "_blank";
            audioDownloadButton.innerText = `Download Audio (${data.result.quality})`;
            downloadSection.appendChild(audioDownloadButton);
        } else {
            downloadSection.innerHTML = "<p>No download link available.</p>";
        }
    } catch (error) {
        downloadSection.innerHTML = `<p>Failed to fetch download link. Please try again later.</p>`;
        console.error(error);
    } finally {
        clearInterval(loadingInterval);
        button.innerText = originalText;
        button.disabled = false;
    }
}
