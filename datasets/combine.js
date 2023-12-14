const fs = require('fs');
const path = require('path');

// Function to shuffle an array (Fisher-Yates shuffle algorithm)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Function to recursively read all files in a directory and its subdirectories
function readFilesRecursively(directoryPath, allObjects, callback) {
  fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error('Error reading the directory:', err);
      return callback(err);
    }

    let filesProcessed = 0;
    if (entries.length === 0) callback(null); // Handle empty directory

    entries.forEach(entry => {
      const fullPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        // If entry is a directory, recurse into it
        readFilesRecursively(fullPath, allObjects, err => {
          if (err) return callback(err);
          filesProcessed++;
          if (filesProcessed === entries.length) callback(null);
        });
      } else {
        // If entry is a file, read it
        fs.readFile(fullPath, 'utf8', (err, data) => {
          if (err) {
            console.error(`Error reading the file ${entry.name}:`, err);
            return callback(err);
          }

          try {
            const objects = JSON.parse(data);
            allObjects.push(...objects);
          } catch (parseErr) {
            console.error(`Error parsing JSON in file ${entry.name}:`, parseErr);
            return callback(parseErr);
          }

          filesProcessed++;
          if (filesProcessed === entries.length) callback(null);
        });
      }
    });
  });
}

// Function to combine and randomize objects from category files
function combineAndRandomize() {
  const directoryPath = path.join(__dirname, 'orion.v0.2');
  const allObjects = [];

  readFilesRecursively(directoryPath, allObjects, err => {
    if (err) {
      console.error('Error processing files:', err);
      return;
    }

    // Shuffle the combined array
    shuffleArray(allObjects);

    // Write to a new file
    const outputFile = path.join(__dirname, 'orion.v0.2.json');
    fs.writeFile(outputFile, JSON.stringify(allObjects, null, 2), err => {
      if (err) {
        console.error('Error writing the combined file:', err);
      } else {
        console.log(`Combined file created at ${outputFile}`);
      }
    });
  });
}

// Call the function
combineAndRandomize();
