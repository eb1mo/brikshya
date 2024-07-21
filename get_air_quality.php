<?php
header('Content-Type: application/json');

$city = $_GET['city'] ?? '';
$lat = $_GET['lat'] ?? '';
$lon = $_GET['lon'] ?? '';

if ($city) {
    $apiKey = 'f0593ae717fe4c9c7355c4ec76dbc572';

    // Get coordinates for the city
    $geoUrl = "http://api.openweathermap.org/geo/1.0/direct?q=" . urlencode($city) . "&limit=1&appid=$apiKey";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $geoUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $geoResponse = curl_exec($ch);

    if ($geoResponse === false) {
        echo json_encode(['error' => 'Failed to get city coordinates']);
        exit;
    }

    $geoData = json_decode($geoResponse, true);

    if (empty($geoData)) {
        echo json_encode(['error' => 'City not found']);
        exit;
    }

    $lat = $geoData[0]['lat'];
    $lon = $geoData[0]['lon'];
} elseif (!$lat || !$lon) {
    echo json_encode(['error' => 'City name or coordinates are required']);
    exit;
}

$apiKey = 'f0593ae717fe4c9c7355c4ec76dbc572';

// Get air quality data
$aqUrl = "http://api.openweathermap.org/data/2.5/air_pollution?lat=$lat&lon=$lon&appid=$apiKey";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $aqUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$aqResponse = curl_exec($ch);

if ($aqResponse === false) {
    echo json_encode(['error' => 'Failed to get air quality data']);
    exit;
}

curl_close($ch);

$aqData = json_decode($aqResponse, true);

if (isset($aqData['list'][0])) {
    echo json_encode($aqData['list'][0]);
} else {
    echo json_encode(['error' => 'No air quality data available']);
}
?>
