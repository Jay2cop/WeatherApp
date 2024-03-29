from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from .models import City

# The main view of the application, displaying the list of cities and their weather data
def home(request):
    if request.method == 'POST':
        city_name = request.POST['city']
        if not City.objects.filter(name=city_name).exists():
            City.objects.create(name=city_name)

        return redirect('home')

    # Fetch the list of cities from the database
    city_list = City.objects.all()

    # Fetch weather data for each city
    city_weather_data = []
    for city in city_list:
        weather_data = fetch_weather_data(city.name)
        city_weather_data.append(weather_data)

    return render(request, 'weather/home.html', {'city_weather_data': city_weather_data})


# Function to fetch weather data from an external API
def fetch_weather_data(city_name):
    import requests

    apikey = '**API**'
    webapi = f'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/weatherdata/forecast?aggregateHours=24&contentType=json&unitGroup=metric&locationMode=single&key={apikey}&locations={city_name}'

    response = requests.get(webapi)
    weather_data = response.json()

    # Check if there's an error in the weather_data
    if 'location' not in weather_data:
        return {'error': f'City {city_name} does not exist in the world!'}

    return weather_data

# View to add a city to the user's list of cities
def add_city(request, city_name):
    if request.method == 'POST':
        city_name = city_name.strip().capitalize()

        # Retrieve the cities from the session or create an empty list if not found
        user_cities = request.session.get('cities', [])

        if city_name in user_cities:
            return JsonResponse({'error': f'City already exists in the list!'})
        else:
            # Fetch the weather data for the new city
            weather_data = fetch_weather_data(city_name)

            # Check if there's an error in the weather_data
            if 'error' in weather_data:
                return JsonResponse(weather_data)
            else:
                user_cities.append(city_name)
                request.session['cities'] = user_cities  # Save the updated list of cities to the session

        response_data = {
            'city_name': city_name,
            'success': True
        }
        return JsonResponse(response_data)
    else:
        return redirect('home')

# View to get weather data for a specific city
def get_weather(request, city_name):
    weather_data = fetch_weather_data(city_name)
    return JsonResponse(weather_data)

# View to remove a city from the user's list of cities
def delete_city(request, city_name):
    # Retrieve the cities from the session or create an empty list if not found
    user_cities = request.session.get('cities', [])

    if city_name in user_cities:
        user_cities.remove(city_name)
        request.session['cities'] = user_cities  # Save the updated list of cities to the session
        return JsonResponse({'success': True})
    else:
        return JsonResponse({'error': f'City not found in the list!'})

# View to get the user's list of cities
def get_cities(request):
    city_names = request.session.get('cities', [])
    return JsonResponse({'cities': city_names})
