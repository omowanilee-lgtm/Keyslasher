export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
//hey my name is gabriel
    export const CHORD_DATABASE = {
      Beginner: {
        timePerChord: 30,
        chords: [
          { name: 'C Major', pitchClasses: [0, 4, 7] },
          { name: 'G Major', pitchClasses: [7, 11, 2] },
          { name: 'F Major', pitchClasses: [5, 9, 0] },
          { name: 'A Minor', pitchClasses: [9, 0, 4] },
          { name: 'E Minor', pitchClasses: [4, 7, 11] }
        ]
      },
      Intermediate: {
        timePerChord: 20,
        chords: [
          { name: 'Cmaj7', pitchClasses: [0, 4, 7, 11] },
          { name: 'Am7', pitchClasses: [9, 0, 4, 7] },
          { name: 'Dm7', pitchClasses: [2, 5, 9, 0] },
          { name: 'G7', pitchClasses: [7, 11, 2, 5] },
          { name: 'Fmaj7', pitchClasses: [5, 9, 0, 4] }
        ]
      },
      Advanced: {
        timePerChord: 10,
        chords: [
          { name: 'Cmaj9', pitchClasses: [0, 4, 7, 11, 2] },
          { name: 'Dm9', pitchClasses: [2, 5, 9, 0, 4] },
          { name: 'G13', pitchClasses: [7, 11, 2, 5, 4] },
          { name: 'A7b9', pitchClasses: [9, 1, 4, 7, 10] },
          { name: 'Fmaj7#11', pitchClasses: [5, 9, 0, 4, 6] }
        ]
      },
      Pro: {
        timePerChord: 5,
        chords: [
          { name: 'Cmaj9#11', pitchClasses: [0, 4, 7, 11, 2, 6] },
          { name: 'G13b9', pitchClasses: [7, 11, 2, 5, 8, 4] },
          { name: 'Dm11', pitchClasses: [2, 5, 9, 0, 4, 7] },
          { name: 'C7alt', pitchClasses: [0, 4, 10, 1, 3] }
        ]
      }
    };
