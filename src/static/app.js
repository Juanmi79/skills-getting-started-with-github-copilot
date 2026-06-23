document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Almacena actividades en memoria para actualizaciones dinámicas
  let activitiesData = {};

  // Helper: convierte un nombre a slug seguro para id
  function slugify(text) {
    return text.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Guardar en memoria y limpiar
      activitiesData = activities;
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // Crear id seguro para la tarjeta
        const slug = slugify(name);
        activityCard.id = `activity-${slug}`;

        // Guardar slug junto a los detalles para futuras actualizaciones
        activitiesData[name].__slug = slug;

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHtml = details.participants.length
          ? `<ul class="participants-list">${details.participants
              .map((participant) => `<li><span class="participant-email">${participant}</span> <button class="remove-participant" data-activity="${name}" data-email="${participant}" aria-label="Remove participant">✕</button></li>`)
              .join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            ${participantsHtml}
          </div>
        `;
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Actualiza la tarjeta de una actividad en la UI (sin recarga)
  function updateActivityCard(name) {
    const details = activitiesData[name];
    if (!details || !details.__slug) return;
    const card = document.getElementById(`activity-${details.__slug}`);
    if (!card) return;

    const spotsLeft = details.max_participants - details.participants.length;
    // actualizar disponibilidad
    const availEl = card.querySelector('.availability');
    if (availEl) {
      availEl.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
    }

    // actualizar lista de participantes
    const participantsContainer = card.querySelector('.participants');
    if (participantsContainer) {
      const participantsHtml = details.participants.length
        ? `<ul class="participants-list">${details.participants
            .map((p) => `<li><span class="participant-email">${p}</span> <button class="remove-participant" data-activity="${name}" data-email="${p}" aria-label="Remove participant">✕</button></li>`)
            .join("")}</ul>`
        : `<p class="no-participants">No participants yet</p>`;
      const header = `<h5>Participants</h5>`;
      participantsContainer.innerHTML = header + participantsHtml;
    }
  }

  // Event delegation: escucha clicks en botones de eliminar
  activitiesList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.remove-participant');
    if (!btn) return;
    const activity = btn.getAttribute('data-activity');
    const email = btn.getAttribute('data-email');
    if (!activity || !email) return;

    // Confirmation (simple)
    if (!confirm(`Remove ${email} from ${activity}?`)) return;

    try {
      const res = await fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      const payload = await res.json();
      if (res.ok) {
        // Update in-memory data and UI
        if (activitiesData[activity]) {
          activitiesData[activity].participants = activitiesData[activity].participants.filter(p => p !== email);
          updateActivityCard(activity);
        } else {
          fetchActivities();
        }
        // show a brief info message
        messageDiv.textContent = payload.message || 'Participant removed';
        messageDiv.className = 'info';
        messageDiv.classList.remove('hidden');
        setTimeout(() => messageDiv.classList.add('hidden'), 3000);
      } else {
        messageDiv.textContent = payload.detail || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Error removing participant', err);
      messageDiv.textContent = 'Failed to remove participant';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Actualizar datos en memoria y refrescar la tarjeta sin recargar la página
        if (activitiesData[activity]) {
          // evitar duplicados simples
          if (!activitiesData[activity].participants.includes(email)) {
            activitiesData[activity].participants.push(email);
          }
          updateActivityCard(activity);
        } else {
          // si la actividad no está en memoria, re-fetch para sincronizar
          fetchActivities();
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
