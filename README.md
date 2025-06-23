# task-rings
A visually expressive, nested task manager built around an interactive, animated pie chart UI. Navigate tasks like file directories, zoom into subtasks, and sync everything via Google Drive using a clean JSON format. Saving occurs automatically whenever tasks change.

## Usage
- Click a slice to focus on that task's subtasks.
- Use the center ring to navigate back to the parent task.
- Use **Add Sibling Task** to create a task under the same parent as the current selection.
- The first time you load the app you will be prompted to sign in with Google Drive.
- A file can be specified in the URL using `?s=g&l=<fileId>`.
- If no file is specified, you can create a new one or choose an existing file after signing in.

# Contributors
For development setup, see [Contributors.md](doc/Contributors.md).
