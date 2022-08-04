const express = require('express');
const router = express.Router();
const dataLayer = require('../dal/products')

//import in the Product model
const { Product, Category, Tag } = require('../models')

//importing the forms
const { bootstrapField, createProductForm, createSearchForm } = require('../forms')

//import in check if authenticated middleware
const { checkIfAuthenticated } = require('../middlewares')

router.get('/', async (req, res) => {
    //fetching all the products
    // let products = await Product.collection().fetch({
    //     withRelated : ['category', 'tags']
    // });

    // res.render('products/index', {
    //     'products' : products.toJSON()
    // })

    // 1. get all the categories
    const allCategories = await dataLayer.getAllCategories()
    allCategories.unshift([0, '----']);


    // 2. Get all the tags
    const allTags = await dataLayer.getAllTags()

    // 3. Create search form 
    let searchForm = createSearchForm(allCategories, allTags);
    let q = Product.collection();

    searchForm.handle(req, {
        'empty': async (form) => {
            let products = await q.fetch({
                withRelated: ['category']
            })
            res.render('products/index', {
                'products': products.toJSON(),
                'form': form.toHTML(bootstrapField)
            })


        },
        'error': async (form) => {
            let products = await q.fetch({
                withRelated: ['category']
            })
            res.render('products/index', {
                'products': products.toJSON(),
                'form': form.toHTML(bootstrapField)
            })
        },
        'success': async (form) => {
            if (form.data.name) {
                q.where('name', 'like', '%'+form.data.name+'%')
            }
            if (form.data.category_id && form.data.category_id != "0") {
                q.where('category_id', '=', form.data.category_id)
            }
            if (form.data.min_cost) {
                q.where ('cost', '>=', form.data.min_cost)
            }
            if (form.data.max_cost) {
                q.where ('cost', '<=', form.data.max_cost)
            }
            if (form.data.tags) {
                q.query ('join', 'products_tags', 'products.id', 'product_id').where(
                    'tag_id', 'in', form.data.tags.split(',')
                )
            }

            let products = await q.fetch ({
                withRelated: ['category']
            })
            res.render('products/index', {
                'products': products.toJSON(),
                'form': form.toHTML(bootstrapField)
            })
        }
    })

})

router.get('/create', async (req, res) => {
    const allCategories = await dataLayer.getAllCategories()

    const allTags = await dataLayer.getAllTags()
    const productForm = createProductForm(allCategories, allTags);
    res.render('products/create', {
        'form': productForm.toHTML(bootstrapField),
        cloudinaryName: process.env.CLOUDINARY_NAME,
        cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
        cloudinaryPreset: process.env.CLOUDINARY_UPLOAD_PRESET
    })
})

router.get('/:product_id/update', async (req, res) => {
    const productId = req.params.product_id
    const product = await dataLayer.getProductByID(productId)
    const allCategories = await Category.fetchAll().map((category) => {
        return [category.get('id'), category.get('name')];
    })
    const allTags = await Tag.fetchAll().map(tag => [tag.get('id'), tag.get('name')]);

    const productForm = createProductForm(allCategories, allTags)

    productForm.fields.name.value = product.get('name')
    productForm.fields.cost.value = product.get('cost');
    productForm.fields.description.value = product.get('description');
    productForm.fields.category_id.value = product.get('category_id');
    //set image URL 
    productForm.fields.image_url.value = product.get('image_url')

    //fill in multi-select for tags
    let selectedTags = await product.related('tags').pluck('id');
    productForm.fields.tags.value = selectedTags;

    res.render('products/update', {
        'form': productForm.toHTML(bootstrapField),
        'product': product.toJSON(),
        //send cloudinary info to HBS file
        cloudinaryName: process.env.CLOUDINARY_NAME,
        cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
        cloudinaryPreset: process.env.CLOUDINARY_UPLOAD_PRESET
    })

})

router.post('/:product_id/update', async (req, res) => {

    // fetch the product that we want to update
    const product = await Product.where({
        'id': req.params.product_id
    }).fetch({
        require: true,
        withRelated: ['tags']
    });
    const allCategories = await Category.fetchAll().map((category) => {
        return [category.get('id'), category.get('name')];
    })
    const allTags = await Tag.fetchAll().map(tag => [tag.get('id'), tag.get('name')]);

    // process the form
    const productForm = createProductForm(allCategories, allTags);
    productForm.handle(req, {
        'success': async (form) => {
            let { tags, ...productData } = form.data
            product.set(productData);
            product.save();
            //update the tags
            let tagIds = tags.split(',');
            let existingTagIds = await product.related('tags').pluck('id');

            // remove all the tags that aren't selected anymore
            let toRemove = existingTagIds.filter(id => tagIds.includes(id) === false);
            await product.tags().detach(toRemove);

            // add in all the tags selected in the form
            await product.tags().attach(tagIds);

            res.redirect('/products');
        },
        'error': async (form) => {
            res.render('products/update', {
                'form': form.toHTML(bootstrapField),
                'product': product.toJSON()
            })
        }
    })

})



router.post('/create', async (req, res) => {
    const allCategories = await Category.fetchAll().map((category) => {
        return [category.get('id'), category.get('name')];
    })
    const allTags = await Tag.fetchAll().map(tag => [tag.get('id'), tag.get('name')])
    const productForm = createProductForm(allCategories, allTags)
    productForm.handle(req, {
        'success': async (form) => {
            //save data from form into new product instance
            let { tags, ...productData } = form.data
            const product = new Product(productData);

            await product.save();
            if (tags) {
                await product.tags().attach(tags.split(','))
            }
            req.flash("success_messages", `New Product ${product.get('name')} has been created`)
            res.redirect('/products')
        },
        'error': async (form) => {
            res.render(
                'products/create', {
                'form': form.toHTML(bootstrapField)
            }
            )
        }
    })
})

router.get('/:product_id/delete', async (req, res) => {
    // fetch the product that we want to delete
    const product = await Product.where({
        'id': req.params.product_id
    }).fetch({
        require: true
    });

    res.render('products/delete', {
        'product': product.toJSON()
    })

});

router.post('/:product_id/delete', async (req, res) => {
    // fetch the product that we want to delete
    const product = await Product.where({
        'id': req.params.product_id
    }).fetch({
        require: true
    });
    await product.destroy();
    res.redirect('/products')
})

module.exports = router;