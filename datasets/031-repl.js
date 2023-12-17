const fs = require('fs');
const path = require('path');
const {glob} = require('glob');

// Define the directory to search in
const directory = path.join(__dirname, 'orion.v0.3.1');

// Define the regex pattern and the replacement string
const regex = /\{\s*"from": "character",\s*"value": "([^\|\n"]+)"\n/g;
const replacement = '{\n        "from": "character",\n        "value": "$1|| none"\n';

// Function to process a file
function processFile(filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file ${filePath}: ${err}`);
      return;
    }

    // Replace the content
    const modifiedData = data.replace(regex, replacement);

    // Write the modified content back to the file
    fs.writeFile(filePath, modifiedData, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing file ${filePath}: ${err}`);
      } else {
        console.log(`File processed: ${filePath}`);
      }
    });
  });
}

// Use glob to find all .json files in the directory and its subdirectories
glob(path.join(directory, '**/*.json'), (err, files) => {
  if (err) {
    console.error(`Error finding files: ${err}`);
    return;
  }

  // Process each file found
  files.forEach(processFile);
});
