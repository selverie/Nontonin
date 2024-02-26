import { Canister, int32, query, text, update } from 'azle';

interface User {
    email: string;
    password: string;
    loggedIn: boolean;
    isAdmin: boolean;
}

interface Movie {
    purchased: boolean;
    title: string;
    price: number;
    rating: number; 
}

let user: User | undefined;
let movies: Movie[] = [];

const registeredUsers: User[] = [];

export default Canister({
    registerUser: update([text, text], text, (email, password) => {
        try {
            const existingUser = registeredUsers.find((user) => user.email === email);
            if (existingUser) {
                throw new Error('Email is already registered. Please use a different email.');
            }

            if (!email.endsWith('@gmail.com')) {
                throw new Error('Invalid email format. Please use an email ending with "@gmail.com".');
            }

            user = { email, password, loggedIn: false, isAdmin: false };
            registeredUsers.push(user);
            return 'User registration successful.';
        } catch (error: any) {
            return `Error: ${error.message}`;
        }
    }),

    registerAdmin: update([text, text], text, (email, password) => {
        try {
            const existingUser = registeredUsers.find((user) => user.email === email);
            if (existingUser) {
                throw new Error('Email is already registered. Please use a different email.');
            }

            if (!email.endsWith('@admin.com')) {
                throw new Error('Invalid email format for admin. Please use an email ending with "@admin.com".');
            }

            user = { email, password, loggedIn: false, isAdmin: true };
            registeredUsers.push(user);
            return 'Admin registration successful.';
        } catch (error: any) {
            return `Error: ${error.message}`;
        }
    }),

    getRegisteredUsers: query([], text, () => {
        try {
            if (registeredUsers.length > 0) {
                return `List of registered users: ${JSON.stringify(registeredUsers)}`;
            } else {
                return 'No registered users yet.';
            }
        } catch (error: any) {
            return `Error: ${error.message}`;
        }
    }),

    login: update([text, text], text, (email, password) => {
        const loggedInUser = registeredUsers.find((user) => user.email === email && user.password === password);

        if (loggedInUser) {
            loggedInUser.loggedIn = true;
            return `Login successful. Welcome, ${loggedInUser.isAdmin ? 'Admin' : 'User'}.`;
        } else {
            return 'Invalid email or password. Please try again.';
        }
    }),

    addMovie: update([text, int32, int32], text, (title, price, rating) => {
        if (user && user.loggedIn && user.isAdmin) {
            const existingMovie = movies.find((movie) => movie.title === title);
            if (existingMovie) {
                return 'Movie with this title already exists. Please use a different title.';
            }

            if (rating < 1 || rating > 10) {
                return 'Invalid rating. Please provide a rating between 1 and 10.';
            }

            movies.push({
                title, price, rating,
                purchased: false
            });
            return `Movie "${title}" added successfully with a rental price of $${price} and a rating of ${rating}.`;
        } else {
            return 'Please login as an admin to add a movie.';
        }
    }),

    rentMovie: update([text, int32], text, (title, rentalDuration) => {
        if (user && user.loggedIn) {
            const selectedMovie = movies.find((movie) => movie.title === title);
            if (selectedMovie) {
                const rentalPrice = selectedMovie.price * rentalDuration;
                return `You have successfully rented "${title}" for ${rentalDuration} days. Total cost : $${rentalPrice}.`;
            } else {
                return `Movie "${title}" not found in the list.`;
            }
        } else {
            return 'Please login to rent a movie.';
        }
    }),

    buyMovie: update([text], text, (title) => {
        if (user && user.loggedIn) {
            const selectedMovie = movies.find((movie) => movie.title === title);
            if (selectedMovie) {
                if (selectedMovie.hasOwnProperty('purchased') && selectedMovie.purchased) {
                    return `Movie "${title}" is already purchased by you.`;
                } else {
                    const purchasePrice = selectedMovie.price;
                    selectedMovie.purchased = true;
                    return `You have successfully purchased "${title}" for $${purchasePrice}.`;
                }
            } else {
                return `Movie "${title}" not found in the list.`;
            }
        } else {
            return 'Please login to buy a movie.';
        }
    }),
    

    removeMovie: update([text], text, (title) => {
        if (user && user.loggedIn && user.isAdmin) {
            const index = movies.findIndex((movie) => movie.title === title);
            if (index !== -1) {
                movies.splice(index, 1);
                return `Movie "${title}" removed successfully.`;
            } else {
                return `Movie "${title}" not found in the list.`;
            }
        } else {
            return 'Please login as an admin to remove a movie.';
        }
    }),

    editMovie: update([text, int32, int32], text, (title, newPrice, newRating) => {
        if (user && user.loggedIn && user.isAdmin) {
            const selectedMovie = movies.find((movie) => movie.title === title);

            if (selectedMovie) {

                if (newRating < 1 || newRating > 10) {
                    return 'Invalid rating. Please provide a rating between 1 and 10.';
                }

                selectedMovie.price = newPrice;
                selectedMovie.rating = newRating;

                return `Movie "${title}" updated successfully. Price : $${newPrice}, Rating : ${newRating}.`;
            } else {
                return `Movie "${title}" not found in the list.`;
            }
        } else {
            return 'Please login as an admin to edit a movie.';
        }
    }),

    getMovieList: query([], text, () => {
        try {
            if (movies.length > 0) {
                return `List of available movies : ${JSON.stringify(movies)}`;
            } else {
                return 'No movies available yet.';
            }
        } catch (error: any) {
            return `Error: ${error.message}`;
        }
    }),
});
