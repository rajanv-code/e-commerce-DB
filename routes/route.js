const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = router;

const User = require('../models/user');
const Product = require('../models/product');
const Cart = require('../models/cart');



router.post('/register', async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });//DB call takes time

        if (existingUser) {
            return res.status(400).json({ error: 'email already exist' })
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);// hashing takes time

        if (req.body.password !== req.body.confirmPassword) {
            return res.status(401).json({ error: 'Password does not match' })
        }

        const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            password: hashedPassword,
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered succesfully' })

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
})

// how bcrypt coompare works,what is user._id

router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        const passwordMatch =await  bcrypt.compare(req.body.password, user.password);
        console.log(passwordMatch,"passwordMatch");
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return res.status(200).json({ token });
    }
    catch (error) {
        return res.status(500).json({ error: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
    };
});


const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ error: "Unautharization: no token providedddddd" })
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorization: no token provided" })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: "Unauthorization: invalid token" })
        }

        req.user = decoded;// why?
        console.log("Decoded user from token: ", decoded);
        next();
    });
}


router.get('/allProducts', verifyToken, async (req, res) => {

    try {
        const allProducts = await Product.find();
        if (!allProducts) {
            return res.status(404).json({ error: 'No products found' });
        }
        res.status(200).json({
            message: "Products fetched successfully",
            products: allProducts
        });

    } catch (error) {
        console.log('eeeeeeeeeeeeeeeeeeeeeeee', error);

        return res.status(500).json({ error: 'errrrrrrrrrrrr ' });
    }
})

router.get('/productPagination', verifyToken, async (req, res) => {
    try {

        const limit = parseInt(req.query.limit);
        const page = parseInt(req.query.page);
        const skip = (page - 1) * limit;

        const products = await Product.find().skip(skip).limit(limit);
        if (!products) {
            return res.status(404).json({ error: 'Products not found' })
        }
        res.status(200).json({
            message: "Products fetched successfully",
            products: products
        });

    } catch (error) {
        return res.status(500).json({ error: 'Products not found' });
    }
})


router.get('/productOne/:id', verifyToken, async (req, res) => {
    try {
        const id = req.params.id;

        const product = await Product.findById(id)
        if (!product) {
            return res.status(401).json({ error: 'Product not found' });
        }
        res.status(200).json({
            message: "Product fetched successfully",
            product: product
        });
    } catch (error) {
        return res.status(500).json({ error: 'Product not foundddddddddddddd' });
    }
})




router.get('/addToCart/:id', verifyToken, async (req, res) => {
    try {
        const P_id = req.params.id;
        if (!P_id) {
            return res.status(401).json({ error: 'Product id not found' });
        }

        const product = await Product.findById(P_id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const user = await User.findById(req.user.id);

        let cart = await Cart.findOne({ user: user._id });
        if (!cart) {
            const newCart = new Cart({
                user: user._id,
                products: [{ productId: product._id, quantity: 1 }]
            });
            await newCart.save();
            return res.status(200).json({ message: "Product added to cart successfully", cart: newCart });
        } else {
            const existingProductIndex = cart.products.findIndex(
                (item) => item.productId.toString() === product._id.toString()
            );

            if (existingProductIndex !== -1) {
                cart.products[existingProductIndex].quantity += 1;
            } else {
                cart.products.push({ productId: product._id, quantity: 1 });
            }

            await cart.save();
            return res.status(200).json({ message: "Product added to cart successfully", cart: cart });
        }

    } catch (error) {
        console.error("Add to Cart Error:", error);
        return res.status(500).json({ error: error.message || 'Something went wrong' });
    }
});


// router.get('/search', async (req, res) => {
//     try {
//         const { title, brand, category, price } = req.query;

//         let query = {};

//         if (title) {
//             query.title = { $regex: title, $options: 'i' };
//         }

//         if (brand) {
//             query.brand = { $regex: brand, $options: 'i' };
//         }

//         if (category) {
//             query.category = { $regex: category, $options: 'i' };
//         }

//         // Check if price is a valid number
//         if (price && !isNaN(price)) {
//             query.price = Number(price);
//         }

//         const products = await Product.find(query);
//         res.status(200).json({ message: "Search result", products });
//     } catch (error) {
//         console.error("Search Error:", error);
//         res.status(500).json({ error: "Search failed" });
//     }
// });


router.get('/search', verifyToken, async (req, res) => {
    try {
        const keyword = req.query.keyword;
        if (!keyword) {
            return res.status(400).json({ error: 'Search keyword is missing' });
        }

        const products = await Product.find({
            $or: [
                { title: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } },
                { category: { $regex: keyword, $options: 'i' } },
                { brand: { $regex: keyword, $options: 'i' } }
            ]
        });

        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'No products found matching your search' });
        }

        res.status(200).json({
            message: "Search results fetched successfully",
            results: products
        });

    } catch (error) {
        console.log("Search Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// router.get('/filterProducts', verifyToken, async (req, res) => {
//     try {
//         const titleKeyword = req.query.title || '';
//         const categoryKeyword = req.query.category || '';
//         const brandKeyword = req.query.brand || '';
//         const minPrice = req.query.minPrice ? parseInt(req.query.minPrice) : null;
//         const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : null;
//         const skip = parseInt(req.query.skip) || 0;
//         const limit = parseInt(req.query.limit) || 10;

//         // Build dynamic query
//         let query = {
//             $or[
//                 { title: { $regex: titleKeyword, $options: 'i' } },
//                 { category: { $regex: categoryKeyword, $options: 'i' } },
//                 { brand: { $regex: brandKeyword, $options: 'i' } }
//             ]
//         };

//         // Apply price range if min or max is provided
//         if (minPrice !== null || maxPrice !== null) {
//             query.$and = [];

//             let priceQuery = {};
//             if (minPrice !== null) priceQuery.$gte = minPrice;
//             if (maxPrice !== null) priceQuery.$lte = maxPrice;

//             query.$and.push({ price: priceQuery });
//         }

//         const products = await Product.find(query)
//             .sort({ price: 1 }) // ascending price
//             .skip(skip)
//             .limit(limit);

//         if (!products || products.length === 0) {
//             return res.status(404).json({ message: 'No products found matching your filters' });
//         }

//         res.status(200).json({
//             message: 'Filtered successfully',
//             results: products
//         });
//     } catch (error) {
//         console.error('==== Filter Error ====', error);
//         res.status(500).json({ error: 'Something went wrong' });
//     }
// });


router.get('/filterProducts', verifyToken, async (req, res) => {
    try {
        const titleKeyword = req.query.title || '';
        const categoryKeyword = req.query.category || '';
        const brandKeyword = req.query.brand || '';
        const minPrice = req.query.minPrice ? parseInt(req.query.minPrice) : null;
        const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : null;
        const limit = parseInt(req.query.limit) || 10;
        const skip = parseInt(req.query.skip) || 0;

        console.log(minPrice,"minPrice",maxPrice,"maxPrice");

        let query = {};
        if (titleKeyword) {
            query.title = { $regex: titleKeyword, $options: 'i' }
        }
        if (categoryKeyword) {
            query.category = { $regex: categoryKeyword, $options: 'i' }
        }
        if (brandKeyword) {
            query.brand = { $regex: brandKeyword, $options: 'i' }
        }

        if (minPrice !== null || maxPrice !== null) {
            query.$and = [];

            let priceQuery = {};
            if (minPrice !== null) priceQuery.$gte = minPrice;
            if (maxPrice !== null) priceQuery.$lte = maxPrice;

            query.$and.push({ price: priceQuery });
        }

        const products = await Product.find(query)
            .sort({ price: 1 }) // ascending price
            .skip(skip)
            .limit(limit);

        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'No products found matching your filters' });
        }

        res.status(200).json({
            message: 'Filtered successfully',
            results: products
        });
    } catch (error) {
        console.error('==== Filter Error ====', error);
        res.status(500).json({ error: 'Something went wrong' });


    }
})





router.get('/range', verifyToken, async (req, res) => {
    try {
        const minPrice = parseInt(req.query.minPrice);
        const maxPrice = parseInt(req.query.maxPrice);
        const products = await Product.find({
            price: { $gte: minPrice, $lte: maxPrice }

        })
        if (!products || products.length === 0) {
            return res.status(404).json({
                message: "No products found in the given price range",

            })
        }
        res.status(200).json({
            message: "Products in the given price range fetched successfully",
            products: products
        });
    } catch (error) {
        res.status(500).json({ error: 'Something went wrong' });

    }
})