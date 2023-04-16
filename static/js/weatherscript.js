document.addEventListener('DOMContentLoaded', () => {
    // Get the stored user_name from the local storage
    let userName = localStorage.getItem('user_name');
    
    // If there's no user_name in local storage, generate a random username
    if (!userName) {
        userName = generateRandomUsername();
        localStorage.setItem('user_name', userName);
    }
    
    // If a valid username is retrieved, display it in the "welcome" element
    if (userName && userName.length != 0) {
        const greetingBox = document.getElementById("welcome");
        greetingBox.removeAttribute("hidden");
        greetingBox.innerHTML = " (" + userName + "@surrey.ac.uk)";
    }

    // Fetch the list of city names from the server
    fetch('/get_cities/')
    .then((response) => response.json())
    .then((data) => {
        // Retrieve the city names from the server response    
        const cityNames = data.cities;
        // For each city name, fetch the weather data and add the city to the list
        cityNames.forEach((cityName) => {
            fetch(`/get_weather/${cityName}/`)
            .then((response) => response.json())
            .then((weatherData) => {
                addCityToList(cityName, weatherData);
            });
        });
    });

    // Set the cursor style back to default
    document.body.style.cursor = "default";

    // Fetch weather data for a specific city (Guildford)
    const cityInfo = document.getElementById('cityinfo');
    const myCity = 'Guildford';
    const webapi = `/get_weather/${myCity}/`;
    fetch(webapi)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            const cityInfo = document.getElementById('cityinfo');
            let todayCondition = `  Now: ${data.location.currentConditions.temp}&#8451 ${data.location.values[0].conditions}`;
            let tmrCondition = `  Tomorrow: ${data.location.values[1].temp}&#8451 ${data.location.values[1].conditions}`;
            cityInfo.innerHTML = myCity.concat(todayCondition, '; ', tmrCondition);
        })
        .catch(function (error) {
            cityInfo.innerHTML = error;
        });
    
    // Function to handle cursor style during page refresh
    function onPageRefresh() {
        document.body.style.cursor = "progress";
        const cursorStyle = document.createElement('style');
        cursorStyle.innerHTML = '*{cursor: progress;}';
        cursorStyle.id = 'cursor-style';
        document.head.appendChild(cursorStyle);
    }

    // Hide the notification element
    document.getElementById('notification').style.display = 'none';
     // Add an event listener to handle form submission for adding a city
    document.getElementById('add-city-form').addEventListener('submit', async (e) => {
        // Prevent the default form submission behavior
        e.preventDefault();

        const cityInput = document.getElementById('city-input');
        const cityName = cityInput.value.trim();
        cityInput.value = '';

        if (!cityName) return;

        // Set up request options for adding a city
        const csrfToken = getCookie('csrftoken');
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({ city_name: cityName }),
        };
        console.log('Sending request:', requestOptions);
        const response = await fetch(`/add_city/${cityName}/`, requestOptions);
        const weatherData = await response.json();
        
        // Check if there's an error in the response and display a notification
        if (weatherData.error) {
            showNotification(weatherData.error, 'error');
        } else if (weatherData.success) {
            // Fetch the weather data for the new city
            const newCityWeatherData = await fetch(`/get_weather/${cityName}/`).then((res) => res.json());
            console.log('New city weather data:', newCityWeatherData);
            
            // Check if there's an error in the new city weather data and display a notification
            if (newCityWeatherData.error) {
                showNotification(newCityWeatherData.error, 'error');
            } else {
                // Add the new city and its weather data to the list of cities
                addCityToList(cityName, newCityWeatherData);
                showNotification(`City added successfully!`, 'add');
            }
        }
    });
    // Create a MutationObserver to detect when a city is added or removed from the list
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                updateWeatherIcons();
            }
        });
    }); 
    // Observe the cityList element for changes in its child elements
    const cityList = document.getElementById('city-list');
    observer.observe(cityList, { childList: true });
    updateWeatherIcons();
});

// Set up event listener for the notification delete button
document.addEventListener('DOMContentLoaded', function() {
    const notificationDeleteButton = document.querySelector('#notification .delete');
    if (notificationDeleteButton) {
        notificationDeleteButton.addEventListener('click', function() {
            const notification = document.getElementById('notification');
            const weatherBackground = document.getElementById('weather-background');
            notification.style.display = 'none';
            weatherBackground.style.maxHeight = '136px';
        });
    }
});

// Function to delete a city and its weather data from the list
async function deleteCity(event, cityName) {
    console.log('deleteCity called:', cityName);
    event.preventDefault();
    const csrfToken = getCookie('csrftoken');
    console.log('Deleting city:', cityName);
    // Set up request options for deleting a city
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ city_name: cityName }),
    };

    console.log('Sending request:', requestOptions);

    // Send the request to delete the city
    const response = await fetch(`/delete_city/${cityName}/`, requestOptions);
    const result = await response.json();

    // If the deletion is successful, remove the city element from the list
    if (result.success) {
        const cityList = document.getElementById('city-list');
        const cityElements = cityList.getElementsByClassName('columns');
        for (let cityElement of cityElements) {
            const cityTitle = cityElement.querySelector('.title');
            if (cityTitle && cityTitle.textContent === cityName) {
                cityList.removeChild(cityElement);
                break;
            }
        }
    showNotification(cityName, 'delete');
    }else {
        console.error('Error deleting city:', result.error);
    }
}

// Function to initialize delete buttons for each city
function initializeDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-city-button');
    for (const button of deleteButtons) {
        const cityName = button.getAttribute('data-city');
        button.addEventListener('click', (event) => deleteCity(event, cityName));
    }
}

// Initialize event listeners on page load
document.addEventListener('DOMContentLoaded', initializeDeleteButtons);

// Function to get a cookie value by name
function getCookie(name) {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Function to add a city and its weather data to the list in the UI
function addCityToList(cityName, weatherData) {
    // Format the cityName with the first letter capitalized and the subsequent parts lowercased
    cityName = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
    // Retrieve the city list element and create a new city element
    const cityList = document.getElementById('city-list');
    const newCity = document.createElement('div');

    // Extract weather data and construct the weather icon source URL
    const weatherIcon = weatherData.location.currentConditions.icon;
    const temp = weatherData.location.currentConditions.temp;
    const conditions = weatherData.location.values[0].conditions;
    const weatherIconSrc = '/static/pictures/weather-icons/' + weatherIcon + '.png';
    console.log('Adding city to list:', cityName, weatherData);

    // Set up the new city element with weather data and add it to the city list
    newCity.classList.add('columns');
    newCity.innerHTML = `
        <div class="column is-offset-4 is-4">
            <div class="box">
                <article class="media">
                    <div class="media-left">
                        <figure class="image is-64x64">
                            <img class="weather-icon" data-icon-id="${weatherData.location.currentConditions.icon}" src="${weatherIconSrc}">
                        </figure>
                    </div>
                    <div class="media-content">
                        <div class="content">
                            <p>
                                <span class="title">${cityName}</span>
                                <br>
                                <span class="subtitle">${temp}° C</span>
                                <br> ${conditions}
                            </p>
                        </div>
                    </div>
                    <div class="media-right">
                        <button class="delete delete-city-button" data-city="${cityName}" type="button"></button>
                    </div>
                </article>
            </div>
        </div>
    `;
    cityList.appendChild(newCity);

     // Initialize delete buttons and update weather icons if the operation was successful
    initializeDeleteButtons();
    if (weatherData.success) {
            updateWeatherIcons();
    }
}

// Function to display a notification based on the action and cityName provided
function showNotification(cityName, action) {
    // Retrieve notification elements
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const weatherBackground = document.getElementById('weather-background');
    
    // Set the notification message and style based on the action
    let message = '';
    if (action === 'error') {
        // Set the notification style to danger and display the error message
        notification.classList.remove('is-success');
        notification.classList.add('is-danger');
        message = cityName;
    } else {
        // Set the notification style to success and display a success message
        notification.classList.remove('is-danger');
        notification.classList.add('is-success');
        message = action === 'add' ? 'City added successfully!' : `Successfully deleted ${cityName}`;
    }

    // Update the notification message and display it
    notificationMessage.innerHTML = message;
    notification.style.display = 'block';

    // Wait for the browser to render the updated notification content
    setTimeout(() => {
        const notificationHeight = notification.offsetHeight;
        weatherBackground.style.maxHeight = `${233 + notificationHeight}px`;
    }, 0);
}

// Function to update the weather icons for all city elements
function updateWeatherIcons() {
    const weatherIcons = document.querySelectorAll('.weather-icon');
    weatherIcons.forEach((icon) => {
        const iconId = icon.dataset.iconId;
        console.log('Updating icon:', icon, iconId);
        if (iconId) {
            icon.src = `/static/pictures/weather-icons/${iconId}.png`;
        }
    });
}

// Function to generate a random username with a prefix and a random number
function generateRandomUsername() {
    const prefix = 'User';
    const randomNum = Math.floor(Math.random() * 100000);
    const userName = prefix + randomNum; 
    console.log('Generated username:', userName);
    return userName;
}

