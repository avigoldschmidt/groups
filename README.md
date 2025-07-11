# Random Group Generator

A web-based tool for creating balanced random groups with proportional representation and restriction handling.

## Features

- **Proportional Representation**: Maintains the same ratio from each column/category in every group
- **Restriction Handling**: Respects "shouldn't be together" constraints
- **Drag & Drop Interface**: Easy CSV file upload
- **Copy to Clipboard**: One-click copying of results
- **Mobile Responsive**: Works on all devices
- **Static Hosting**: Can be hosted on GitHub Pages

## How to Use

1. **Prepare your CSV file** with the following format:
   - First row: Headers (optional but recommended)
   - Participant columns: Any number of columns containing participant names
   - Empty column: Leave a column empty to separate participants from restrictions
   - Restriction columns: Names of people who shouldn't be grouped together

2. **Upload your CSV file** by dragging and dropping or clicking to browse

3. **Set the number of groups** you want to create

4. **Click "Generate Groups"** to create balanced random groups

5. **Copy the results** to your clipboard for easy pasting into documents

## CSV Format Example

```csv
Bunk 17,Bunk 29,Bunk 30,,Shouldn't be together,More restrictions
Aaron,Ayelet,Eliza,,Noah P,Jade
Ari,Jade,Amanda,,Noah P,Ethan
Rueben,Anabelle,Logan,,Sylvia,Noa
Levi,Emily,Danielle,,Ari,Reuben
```

## Hosting on GitHub Pages

### Option 1: Simple Upload
1. Create a new repository on GitHub
2. Upload the `index.html` file
3. Go to repository Settings → Pages
4. Select "Deploy from a branch" and choose `main` branch
5. Your site will be available at `https://yourusername.github.io/repository-name`

### Option 2: Clone and Push
1. Clone this repository
2. Create a new repository on GitHub
3. Push the files to your new repository
4. Enable GitHub Pages in repository settings

### Option 3: Fork and Deploy
1. Fork this repository
2. Go to your fork's Settings → Pages
3. Enable GitHub Pages
4. Your site will be available at `https://yourusername.github.io/groups`

## Technical Details

- **Pure HTML/CSS/JavaScript**: No build process required
- **Client-side Processing**: All CSV parsing and group generation happens in the browser
- **No Server Required**: Works entirely as a static website
- **Modern Browser Support**: Uses ES6+ features

## Algorithm

The group generation algorithm:
1. Maintains proportional representation from each column
2. Attempts up to 5,000 random combinations
3. Minimizes restriction violations
4. Returns the best solution found

## Browser Compatibility

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is open source and available under the MIT License.
