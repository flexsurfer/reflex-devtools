import { initAppDb } from "@flexsurfer/reflex";

// Initialize the app database
initAppDb({
    users: [
      { id: 1, name: 'John Doe', active: true },
      { id: 2, name: 'Jane Smith', active: false },
      { id: 3, name: 'Bob Johnson', active: true }
    ],
    counter: 0,
    isLoading: false
  });