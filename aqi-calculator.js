// Function to estimate the number of trees required
function estimateTreesRequired(currentAQI, targetAQI, areaInAcres) {
    const aqiReduction = currentAQI - targetAQI;
    const reductionPer20Trees = 2.5; // This is a constant; adjust as necessary
    const reductionsNeeded = aqiReduction / (currentAQI * (reductionPer20Trees / 100));
    const treesNeeded = Math.ceil(reductionsNeeded * 20 * areaInAcres);
    return treesNeeded;
}

// Function to get color for AQI level
function getColorForAQI(aqi) {
    if (aqi <= 50) return "green";
    if (aqi <= 100) return "yellow";
    if (aqi <= 150) return "orange";
    if (aqi <= 200) return "red";
    if (aqi <= 300) return "purple";
    return "maroon";
}

// Function to update the card with AQI data
function updateCard(aqi, category, dominantPollutant, pollutantsHTML, locationInfo) {
    const resultDiv = document.getElementById("result");
    const areaInAcres = 247;
    const targetAQI = 50;
    const treesRequired = estimateTreesRequired(aqi, targetAQI, areaInAcres);
    const color = getColorForAQI(aqi);

    resultDiv.innerHTML = `
      <div class="card" style="width:20rem;">
        <div class="card-body">
          <h5 class="card-title">Current AQI</h5>
          ${locationInfo ? `<h6 class="card-subtitle mb-2 text-body-secondary">${locationInfo}</h6>` : ''}
          <h5 class="card-title fw-bold">${aqi}</h5>
          <h6 class="card-subtitle mb-2 text-body-secondary">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; margin-right: 5px;"></span>
            ${category}
          </h6>
          <h6 class="card-subtitle mb-2 text-body-secondary">Dominant Pollutant: ${dominantPollutant}</h6>
          ${pollutantsHTML}
        </div>
      </div>`;

    if (treesRequired !== undefined) {
        if (aqi <= 50) {
            document.getElementById('treeEstimation').innerHTML = `
        <div class="alert alert-info">
            AQI is under safe limit.
        </div>`;
        } else {
            document.getElementById('treeEstimation').innerHTML = `
        <div class="alert alert-info">
            To reduce AQI from ${aqi} to ${targetAQI} in an area of ${areaInAcres} acres (1 sq. km), approximately ${treesRequired} trees need to be planted.
        </div>`;
        }
    }
}

// Function to fetch AQI based on user's location
async function fetchAQIByLocation(latitude, longitude) {
    try {
        const response = await fetch(
            `get_air_quality.php?lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();

        if (data.error) {
            updateCard('Error', data.error, '', '', '');
        } else {
            const { aqi, category, dominantPollutant } = calculateAQI(data);
            const pollutantsHTML = generatePollutantsHTML(data);
            updateCard(aqi, category, dominantPollutant, pollutantsHTML, `Latitude: ${latitude} &deg; <br> Longitude: ${longitude} &deg;`);
        }
    } catch (error) {
        updateCard('Error', error.message, '', '', '');
    }
}

// Function to handle geolocation
function handleGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const { latitude, longitude } = position.coords;
            fetchAQIByLocation(latitude, longitude);
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
        }, function (error) {
            updateCard('Error', error.message, '', '', '');
        });
    } else {
        updateCard('Error', 'Geolocation is not supported by this browser.', '', '', '');
    }
}

// Event listener for city form submission
document.getElementById("cityForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const city = document.getElementById("cityName").value;
    const resultDiv = document.getElementById("result");
    resultDiv.textContent = "Loading...";

    try {
        const response = await fetch(
            `get_air_quality.php?city=${encodeURIComponent(city)}`
        );
        const data = await response.json();

        if (data.error) {
            updateCard('Error', data.error, '', '', '');
        } else {
            const { aqi, category, dominantPollutant } = calculateAQI(data);
            const pollutantsHTML = generatePollutantsHTML(data);
            updateCard(aqi, category, dominantPollutant, pollutantsHTML, city);
        }
    } catch (error) {
        updateCard('Error', error.message, '', '', '');
    }
});

// Fetch AQI based on user's location as soon as the page loads
window.addEventListener("load", handleGeolocation);

function calculateAQI(data) {
  const pollutants = {
    pm25: { name: "PM2.5", value: data.components.pm2_5, unit: "μg/m³" },
    pm10: { name: "PM10", value: data.components.pm10, unit: "μg/m³" },
    o3: { name: "Ozone", value: data.components.o3 / 1000, unit: "ppm" },
    no2: { name: "Nitrogen Dioxide", value: data.components.no2, unit: "ppb" },
    so2: { name: "Sulfur Dioxide", value: data.components.so2, unit: "ppb" },
    co: {
      name: "Carbon Monoxide",
      value: data.components.co / 1000,
      unit: "ppm",
    },
  };

  let maxAQI = 0;
  let dominantPollutant = "";

  for (const [pollutant, info] of Object.entries(pollutants)) {
    const aqi = calculatePollutantAQI(pollutant, info.value);
    if (aqi > maxAQI) {
      maxAQI = aqi;
      dominantPollutant = info.name;
    }
  }

  return {
    aqi: maxAQI,
    category: getAQICategory(maxAQI),
    dominantPollutant: dominantPollutant,
  };
}

function calculatePollutantAQI(pollutant, concentration) {
  const breakpoints = getBreakpoints(pollutant);

  for (let i = 1; i < breakpoints.length; i++) {
    if (concentration <= breakpoints[i].concentration) {
      const [low, high] = [breakpoints[i - 1], breakpoints[i]];
      return Math.round(
        ((high.index - low.index) / (high.concentration - low.concentration)) *
          (concentration - low.concentration) +
          low.index
      );
    }
  }

  return breakpoints[breakpoints.length - 1].index;
}

function getBreakpoints(pollutant) {
  const breakpoints = {
    pm25: [
      { concentration: 0, index: 0 },
      { concentration: 12.0, index: 50 },
      { concentration: 35.4, index: 100 },
      { concentration: 55.4, index: 150 },
      { concentration: 150.4, index: 200 },
      { concentration: 250.4, index: 300 },
      { concentration: 350.4, index: 400 },
      { concentration: 500.4, index: 500 },
    ],
    pm10: [
      { concentration: 0, index: 0 },
      { concentration: 54, index: 50 },
      { concentration: 154, index: 100 },
      { concentration: 254, index: 150 },
      { concentration: 354, index: 200 },
      { concentration: 424, index: 300 },
      { concentration: 504, index: 400 },
      { concentration: 604, index: 500 },
    ],
    o3: [
      { concentration: 0, index: 0 },
      { concentration: 0.054, index: 50 },
      { concentration: 0.07, index: 100 },
      { concentration: 0.085, index: 150 },
      { concentration: 0.105, index: 200 },
      { concentration: 0.2, index: 300 },
      { concentration: 0.404, index: 400 },
      { concentration: 0.604, index: 500 },
    ],
    no2: [
      { concentration: 0, index: 0 },
      { concentration: 53, index: 50 },
      { concentration: 100, index: 100 },
      { concentration: 360, index: 150 },
      { concentration: 649, index: 200 },
      { concentration: 1249, index: 300 },
      { concentration: 2049, index: 400 },
      { concentration: 4049, index: 500 },
    ],
    so2: [
      { concentration: 0, index: 0 },
      { concentration: 35, index: 50 },
      { concentration: 75, index: 100 },
      { concentration: 185, index: 150 },
      { concentration: 304, index: 200 },
      { concentration: 604, index: 300 },
      { concentration: 804, index: 400 },
      { concentration: 1004, index: 500 },
    ],
    co: [
      { concentration: 0, index: 0 },
      { concentration: 4.4, index: 50 },
      { concentration: 9.4, index: 100 },
      { concentration: 12.4, index: 150 },
      { concentration: 15.4, index: 200 },
      { concentration: 30.4, index: 300 },
      { concentration: 40.4, index: 400 },
      { concentration: 50.4, index: 500 },
    ],
  };

  return breakpoints[pollutant] || [];
}

function getAQICategory(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function generatePollutantsHTML(data) {
  const pollutants = {
    pm25: { name: "PM2.5", value: data.components.pm2_5, unit: "μg/m³" },
    pm10: { name: "PM10", value: data.components.pm10, unit: "μg/m³" },
    o3: { name: "Ozone", value: data.components.o3 / 1000, unit: "ppm" },
    no2: { name: "Nitrogen Dioxide", value: data.components.no2, unit: "ppb" },
    so2: { name: "Sulfur Dioxide", value: data.components.so2, unit: "ppb" },
    co: {
      name: "Carbon Monoxide",
      value: data.components.co / 1000,
      unit: "ppm",
    },
  };

  let html = "";
  for (const [pollutant, info] of Object.entries(pollutants)) {
    html += `
      <p class="mb-0">${info.name}: ${info.value} ${info.unit}</p>
    `;
  }
  return html;
}
