Add-Type -AssemblyName System.Speech
$fixtureRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/samples'))
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = 0
$voices = @($synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' })
if ($voices.Count -eq 0) { throw 'Install an English Windows speech voice to regenerate these synthetic fixtures.' }
$synth.SelectVoice($voices[0].VoiceInfo.Name)
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
$scripts = [ordered]@{
 'normal' = 'Alex had the first coffee, pasta and fries. Sam had the second coffee and burger. Lee had the salad.'
 'shared' = 'Alex had the first coffee and pasta. Sam had the second coffee and burger. Lee had the salad. Split the fries equally between all three of us.'
 'before-correction' = 'Alex had both coffees and pasta. Sam had the burger. Lee had the salad. Share the fries equally between everyone.'
 'correction' = "Actually, the second coffee was Sam's."
 'ambiguous' = 'Sam had a coffee.'
 'clarify-price' = 'The pasta is twelve euros and forty cents.'
}
$manifest = @()
foreach ($entry in $scripts.GetEnumerator()) {
 $target = Join-Path $fixtureRoot ($entry.Key + '.wav')
 $synth.SetOutputToWaveFile($target,$format)
 $synth.Speak($entry.Value)
 $synth.SetOutputToNull()
 $manifest += @{ name=$entry.Key; text=$entry.Value; file=($entry.Key+'.wav'); synthetic=$true; voice=$voices[0].VoiceInfo.Name; sampleRate=24000; generationCostUSD=0; generation='Windows System.Speech; not human recordings' }
}
$synth.Dispose()
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $fixtureRoot 'voices.json') -Encoding utf8
Write-Output "Generated $($manifest.Count) synthetic recordings."
