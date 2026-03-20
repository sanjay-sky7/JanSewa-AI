param(
  [string]$BaseUrl = "http://localhost:8000/api"
)

$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
  param(
    [string]$Url,
    [hashtable]$Body,
    [hashtable]$Headers
  )
  $json = $Body | ConvertTo-Json -Depth 8
  return Invoke-RestMethod -Method Post -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json
}

function Invoke-JsonPut {
  param(
    [string]$Url,
    [hashtable]$Body,
    [hashtable]$Headers
  )
  $json = $Body | ConvertTo-Json -Depth 8
  return Invoke-RestMethod -Method Put -Uri $Url -Headers $Headers -ContentType "application/json" -Body $json
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "smoke+$stamp@jansewa.local"
$password = "SmokeTest@123"
$phone = "+9198$([System.Random]::new().Next(10000000,99999999))"

Write-Host "[1/6] Registering user: $email"
$registerBody = @{
  name = "Smoke Citizen"
  email = $email
  password = $password
  role = "CITIZEN"
  ward_id = 1
  phone = $phone
}
$null = Invoke-JsonPost -Url "$BaseUrl/auth/register" -Body $registerBody -Headers @{}

Write-Host "[2/6] Logging in"
$loginBody = @{ email = $email; password = $password }
$login = Invoke-JsonPost -Url "$BaseUrl/auth/login" -Body $loginBody -Headers @{}
$token = $login.access_token
if (-not $token) { throw "Login did not return access_token" }
$authHeaders = @{ Authorization = "Bearer $token" }

Write-Host "[3/6] Updating profile (auth-protected)"
$profileBody = @{
  name = "Smoke Citizen Updated"
  phone = $phone
  department = "Citizen"
  ward_id = 2
}
$me = Invoke-JsonPut -Url "$BaseUrl/auth/me" -Body $profileBody -Headers $authHeaders

Write-Host "[4/6] Creating voice complaint (audio file payload without text)"
# Minimal MP3 header bytes (base64) to simulate uploaded voice file.
$audioDataUrl = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjQwLjEwMQAAAAAAAAAAAAAA"
$voiceBody = @{
  input_type = "voice"
  ward_id = 2
  source_language = "auto"
  raw_text = $null
  raw_audio_url = $audioDataUrl
  citizen_name = "Smoke Citizen Updated"
  citizen_phone = $phone
  is_anonymous = $false
}
$voiceComplaint = Invoke-JsonPost -Url "$BaseUrl/complaints" -Body $voiceBody -Headers @{}

Write-Host "[5/6] Creating image complaint (auto-category path)"
# Tiny valid PNG payload.
$imageDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQYGABx0A/20LQp2AAAAAElFTkSuQmCC"
$imageBody = @{
  input_type = "image"
  ward_id = 2
  source_language = "auto"
  raw_text = $null
  raw_image_url = $imageDataUrl
  citizen_name = "Smoke Citizen Updated"
  citizen_phone = $phone
  is_anonymous = $false
}
$imageComplaint = Invoke-JsonPost -Url "$BaseUrl/complaints" -Body $imageBody -Headers @{}

Write-Host "[6/6] Verifying complaints list by citizen phone"
$encodedPhone = [System.Uri]::EscapeDataString($phone)
$list = Invoke-RestMethod -Method Get -Uri "$BaseUrl/complaints?page=1&per_page=10&citizen_phone=$encodedPhone"

Write-Host ""
Write-Host "Smoke test completed successfully." -ForegroundColor Green
Write-Host "User:" $me.email
Write-Host "Voice complaint:" $voiceComplaint.id "| status:" $voiceComplaint.status "| raw_text:" $voiceComplaint.raw_text
Write-Host "Image complaint:" $imageComplaint.id "| status:" $imageComplaint.status "| category:" $imageComplaint.category.name
Write-Host "Listed complaints:" $list.total
