import { Canister, int32, query, text, update, StableBTreeMap, Result, Err, Ok } from 'azle';
import bcrypt from 'bcryptjs';

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

const userStorage = StableBTreeMap(text, User);
const movieStorage = StableBTreeMap(text, Movie);

export default Canister({
    registerUser: update([text, text], Result(text, text), async (email, password) => {
        try {
            const existingUser = userStorage.get(email);
            if ('Some' in existingUser) {
                throw new Error('Email is already registered. Please use a different email.');
            }

            if (!email.endsWith('@gmail.com')) {
                throw new Error('Invalid email format. Please use an email ending with "@gmail.com".');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = { email, password: hashedPassword, loggedIn: false, isAdmin: false };
            userStorage.insert(email, user);
            return Ok('User registration successful.');
        } catch (error: any) {
            return Err(`Error: ${error.message}`);
        }
    }),

    registerAdmin: update([text, text], Result(text, text), async (email, password) => {
        try {
            const existingUser = userStorage.get(email);
            if ('Some' in existingUser) {
                throw new Error('Email is already registered. Please use a different email.');
            }

            if (!email.endsWith('@admin.com')) {
                throw new Error('Invalid email format for admin. Please use an email ending with "@admin.com".');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = { email, password: hashedPassword, loggedIn: false, isAdmin: true };
            userStorage.insert(email, user);
            return Ok('Admin registration successful.');
        } catch (error: any) {
            return Err(`Error: ${error.message}`);
        }
    }),

    getRegisteredUsers: query([], Result(Vec(User), text), () => {
        const users = userStorage.values();
        if (users.length > 0) {
            return Ok(users);
        } else {
            return Err('No registered users yet.');
        }
    }),

    login: update([text, text], Result(text, text), async (email, password) => {
        const user = userStorage.get(email);
        if ('Some' in user && await bcrypt.compare(password, user.Some.password)) {
            user.Some.loggedIn = true;
            return Ok(`Login successful. Welcome, ${user.Some.isAdmin ? 'Admin' : 'User'}.`);
        } else {
            return Err('Invalid email or password. Please try again.');
        }
    }),

    addMovie: update([text, int32, int32], Result(text, text), (title, price, rating) => {
        const user = userStorage.get(ic.caller());
        if ('Some' in user && user.Some.loggedIn && user.Some.isAdmin) {
            const existingMovie = movieStorage.get(title);
            if ('Some' in existingMovie) {
                return Err('Movie with this title already exists. Please use a different title.');
            }

            if (rating < 1 || rating > 10) {
                return Err('Invalid rating. Please provide a rating between 1 and 10.');
            }

            const movie = { title, price, rating, purchased: false };
            movieStorage.insert(title, movie);
            return Ok(`Movie "${title}" added successfully with a rental price of $${price} and a rating of ${rating}.`);
        } else {
            return Err('Please login as an admin to add a movie.');
        }
    }),

    rentMovie: update([text, int32], Result(text, text), (title, rentalDuration) => {
        const user = userStorage.get(ic.caller());
        if ('Some' in user && user.Some.loggedIn) {
            const selectedMovie = movieStorage.get(title);
            if ('Some' in selectedMovie) {
                const rentalPrice = selectedMovie.Some.price * rentalDuration;
                return Ok(`You have successfully rented "${title}" for ${rentalDuration} days. Total cost : $${rentalPrice}.`);
            } else {
                return Err(`Movie "${title}" not found in the list.`);
            }
        } else {
            return Err('Please login to rent a movie.');
        }
    }),

    buyMovie: update([text], Result(text, text), (title) => {
        const user = userStorage.get(ic.caller());
        if ('Some' in user && user.Some.loggedIn) {
            const selectedMovie = movieStorage.get(title);
            if ('Some' in selectedMovie) {
                if (selectedMovie.Some.purchased) {
                    return Err(`Movie "${title}" is already purchased by you.`);
                } else {
                    const purchasePrice = selectedMovie.Some.price;
                    selectedMovie.Some.purchased = true;
                    return Ok(`You have successfully purchased "${title}" for $${purchasePrice}.`);
                }
            } else {
                return Err(`Movie "${title}" not found in the list.`);
            }
        } else {
            return Err('Please login to buy a movie.');
        }
    }),

    removeMovie: update([text], Result(text, text), (title) => {
        const user = userStorage.get(ic.caller());
        if ('Some' in user && user.Some.loggedIn && user.Some.isAdmin) {
            const existingMovie = movieStorage.get(title);
            if ('Some' in existingMovie) {
                movieStorage.remove(title);
                return Ok(`Movie "${title}" removed successfully.`);
            } else {
                return Err(`Movie "${title}" not found in the list.`);
            }
        } else {
            return Err('Please login as an admin to remove a movie.');
        }
    }),

    editMovie: update([text, int32, int32], Result(text, text), (title, newPrice, newRating) => {
        const user = userStorage.get(ic.caller());
        if ('Some' in user && user.Some.loggedIn && user.Some.isAdmin) {
            const selectedMovie = movieStorage.get(title);

            if ('Some' in selectedMovie) {

                if (newRating < 1 || newRating > 10) {
                    return Err('Invalid rating. Please provide a rating between 1 and 10.');
                }

                selectedMovie.Some.price = newPrice;
                selectedMovie.Some.rating = newRating;

                return Ok(`Movie "${title}" updated successfully. Price : $${newPrice}, Rating : ${newRating}.`);
            } else {
                return Err(`Movie "${title}" not found in the list.`);
            }
        } else {
            return Err('Please login as an admin to edit a movie.');
        }
    }),

    getMovieList: query([], Result(Vec(Movie), text), () => {
        const movies = movieStorage.values();
        if (movies.length > 0) {
            return Ok(movies);
        } else {
            return Err('No movies available yet.');
        }
    }),
});
