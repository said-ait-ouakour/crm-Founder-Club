import axios from 'axios';

const API_ENDPOINT = '/api/polly/text-to-speech';

export class PollyService {
  private static readonly VOICE_ID = 'Amy';
  private static readonly OUTPUT_FORMAT = 'mp3';
  private static readonly LANGUAGE_CODE = 'en-GB';

  static async textToSpeech(text: string): Promise<string> {
    try {
      const response = await axios.post(API_ENDPOINT, {
        text,
        voiceId: this.VOICE_ID,
        outputFormat: this.OUTPUT_FORMAT,
        languageCode: this.LANGUAGE_CODE
      }, {
        responseType: 'blob' // Important: This tells axios to handle the response as a blob
      });
  
      if (!response.data) {
        throw new Error('No audio data received from Polly service');
      }
  
      // Create a blob URL from the audio data
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error converting text to speech:', error);
      throw error;
    }
  }

  /**
   * Stop all playing audio elements
   */
  static stopSpeaking(): void {
    const audioElements = document.getElementsByTagName('audio');
    Array.from(audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }
} 