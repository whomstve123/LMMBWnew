# Audio Stems

This directory contains the audio stems used for generating unique tracks based on face hash data.

## Structure

- `/drums` - Drum loops and percussion (files named 1.wav through 5.wav)
- `/pads` - Ambient pads and textures (files named 1.wav through 5.wav)
- `/bass` - Bass lines and low-end elements (files named 1.wav through 5.wav)
- `/noise` - Noise elements and textural sounds (files named 1.wav through 5.wav)

## Usage

These stems are used by the `/api/generateTrack` endpoint to create unique audio combinations based on the user's biometric data.

The system will select one stem from each category based on the face hash, then mix them together to create a personalized audio track.
