document.addEventListener("DOMContentLoaded", () => {
  const playersList = document.getElementById("playersList");
  const favoritesList = document.getElementById("favoritesList");
  const searchInput = document.getElementById("searchInput");
  const positionFilter = document.getElementById("positionFilter");
  const countryFilter = document.getElementById("countryFilter");
  const addPlayerForm = document.getElementById("addPlayerForm");
  const formError = document.getElementById("formError");

  let allPlayers = [];
  const favorites = new Set();

  const STORAGE_PLAYERS_KEY = "arsenalPlayers";
  const STORAGE_FAVORITES_KEY = "arsenalFavorites";

  const imageObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy");
                observer.unobserve(img);
              }
            });
          },
          { rootMargin: "0px 0px 200px 0px" }
        )
      : null;

  function lazyLoadImages() {
    document.querySelectorAll("img.lazy").forEach((img) => {
      if (imageObserver) {
        imageObserver.observe(img);
      } else {
        img.src = img.dataset.src;
        img.classList.remove("lazy");
      }
    });
  }

  function saveToLocalStorage() {
    localStorage.setItem(STORAGE_PLAYERS_KEY, JSON.stringify(allPlayers));
    localStorage.setItem(STORAGE_FAVORITES_KEY, JSON.stringify([...favorites]));
  }

  function loadFromLocalStorage() {
    const savedPlayers = localStorage.getItem(STORAGE_PLAYERS_KEY);
    const savedFavorites = localStorage.getItem(STORAGE_FAVORITES_KEY);
    if (savedPlayers) allPlayers = JSON.parse(savedPlayers);
    if (savedFavorites)
      JSON.parse(savedFavorites).forEach((id) => favorites.add(id));
  }

  function renderPlayers(players) {
    playersList.innerHTML = "";
    if (players.length === 0) {
      playersList.innerHTML = "<p>Geen spelers gevonden.</p>";
      return;
    }

    players.forEach((player) => {
      const card = document.createElement("div");
      card.className = "player-card";
      card.innerHTML = `
        <img 
          data-src="${player.strCutout || "https://via.placeholder.com/150"}" 
          alt="${player.strPlayer}" 
          class="lazy"
        />
        <h3>${player.strPlayer}</h3>
        <p><strong>Positie:</strong> ${player.strPosition}</p>
        <p><strong>Nationaliteit:</strong> ${player.strNationality}</p>
        <button class="fav-btn" data-id="${player.idPlayer}">
          ${
            favorites.has(player.idPlayer)
              ? "Verwijder uit favorieten"
              : "Voeg toe aan favorieten"
          }
        </button>
      `;

      card
        .querySelector(".fav-btn")
        .addEventListener("click", () => toggleFavorite(player));

      playersList.appendChild(card);
    });

    lazyLoadImages();
  }

  function renderFavorites() {
    favoritesList.innerHTML = "";
    const favoritePlayers = allPlayers.filter((p) => favorites.has(p.idPlayer));
    favoritePlayers.forEach((player) => {
      const div = document.createElement("div");
      div.className = "player-card";
      div.innerHTML = `
        <img 
          data-src="${player.strCutout || "https://via.placeholder.com/150"}" 
          alt="${player.strPlayer}" 
          class="lazy"
        />
        <h3>${player.strPlayer}</h3>
      `;
      favoritesList.appendChild(div);
    });

    lazyLoadImages();
  }

  //  Optie favoriet zetten 
  function toggleFavorite(player) {
    favorites.has(player.idPlayer)
      ? favorites.delete(player.idPlayer)
      : favorites.add(player.idPlayer);
    saveToLocalStorage();
    renderPlayers(filterPlayers());
    renderFavorites();
  }

  //  Filter spelers 
  function filterPlayers() {
    const search = searchInput.value.toLowerCase();
    const pos = positionFilter.value;
    const nat = countryFilter.value;
    return allPlayers.filter((player) => {
      const matchName = player.strPlayer.toLowerCase().includes(search);
      const matchPos = !pos || player.strPosition === pos;
      const matchNat = !nat || player.strNationality === nat;
      return matchName && matchPos && matchNat;
    });
  }

  //  Update filter opties 
  function updateFilters() {
    const positions = [
      ...new Set(allPlayers.map((p) => p.strPosition).filter(Boolean)),
    ];
    const nationalities = [
      ...new Set(allPlayers.map((p) => p.strNationality).filter(Boolean)),
    ];
    positionFilter.innerHTML =
      `<option value="">Alle</option>` +
      positions.map((pos) => `<option>${pos}</option>`).join("");
    countryFilter.innerHTML =
      `<option value="">Alle</option>` +
      nationalities.map((nat) => `<option>${nat}</option>`).join("");
  }

  //  Event listeners voor filters 
  searchInput.addEventListener("input", () => renderPlayers(filterPlayers()));
  positionFilter.addEventListener("change", () =>
    renderPlayers(filterPlayers())
  );
  countryFilter.addEventListener("change", () =>
    renderPlayers(filterPlayers())
  );

  //  Speler toevoegen formulier 
  addPlayerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("playerName").value.trim();
    const position = document.getElementById("playerPosition").value;
    const nationality = document
      .getElementById("playerNationality")
      .value.trim();
    const file = document.getElementById("playerPhotoFile").files[0];

    if (!name || !position || !nationality) {
      formError.textContent = "Gelieve alle verplichte velden in te vullen.";
      formError.style.display = "block";
      return;
    }
    formError.style.display = "none";

    const handleNewPlayer = (cutout) => {
      const newPlayer = {
        idPlayer: "user_" + Date.now(),
        strPlayer: name,
        strPosition: position,
        strNationality: nationality,
        strCutout: cutout,
      };
      allPlayers.push(newPlayer);
      saveToLocalStorage();
      updateFilters();
      renderPlayers(filterPlayers());
      addPlayerForm.reset();
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => handleNewPlayer(e.target.result);
      reader.readAsDataURL(file);
    } else {
      handleNewPlayer("https://via.placeholder.com/150");
    }
  });

  loadFromLocalStorage();
  if (allPlayers.length > 0) {
    updateFilters();
    renderPlayers(allPlayers);
    renderFavorites();
  } else {
    fetch(
      "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=Arsenal"
    )
      .then((res) => res.json())
      .then((data) => {
        allPlayers = data.player || [];
        saveToLocalStorage();
        updateFilters();
        renderPlayers(allPlayers);
      })
      .catch((err) => {
        console.error("Fout bij ophalen spelers:", err);
        playersList.innerHTML = "<p>Fout bij laden van spelers.</p>";
      });
  }
});
