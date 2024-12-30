/*
## ADD INVOICES**

Add routes/invoices.js. All routes in this file should be prefixed by /invoices. */

const express = require('express');
const ExpressError = require('../expressError');
const db = require('../db')

let router = new express.Router();

// ROUTES

// **GET /invoices :** Return info on invoices: like `{invoices: [{id, comp_code}, ...]}`
// **GET /invoices :** Return info on invoices: like `{invoices: [{id, comp_code}, ...]}`
router.get('/invoices', async (req, res, next) => {
    try {
        const results = await db.query(
            `SELECT id, comp_code
             FROM invoices
             ORDER BY comp_code ASC`
        );

        return res.json({ invoices: results.rows });
    } catch (err) {
        return next(err);
    }
});

// **GET /invoices/[id] :** Returns obj on given invoice.
// If invoice cannot be found, returns 404. Returns `{invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}}`
// **GET /invoices/:id :** Returns obj on given invoice or 404 if not found.
router.get('/invoices/:id', async (req, res, next) => {
    const { id } = req.params; // Extract id from the URL

    try {
        const invoiceResult = await db.query(
            `SELECT i.id, i.amt, i.paid, i.add_date, i.paid_date,
            c.code AS company_code, c.name AS company_name, c.description AS company_description
             FROM invoices AS i
             LEFT JOIN companies AS c
             ON i.comp_code = c.code
             WHERE i.id = $1`,
            [id]
        );

        // Check if the invoice exists
        if (invoiceResult.rows.length === 0) {
            const error = new ExpressError(`Invoice '${id}' not found`, 404);
            return next(error);
        }

        // Reformat the data to match the expected response
        const invoice = invoiceResult.rows[0];
        const response = {
            id: invoice.id,
            amt: invoice.amt,
            paid: invoice.paid,
            add_date: invoice.add_date,
            paid_date: invoice.paid_date,
            company: {
                code: invoice.company_code,
                name: invoice.company_name,
                description: invoice.company_description,
            },
        };

        return res.json({ invoice: response });

    } catch (err) {
        return next(err); // Handle errors gracefully
    }
});

// **POST /invoices :** Adds an invoice. Needs to be passed in JSON body of: `{comp_code, amt}`
// Returns: `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}`
// **POST /invoices :** Adds an invoice. Needs to be passed in JSON body of: `{comp_code, amt}`
// Returns: `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}`

router.post('/invoices', async (req, res, next) => {
    try {
        const { comp_code, amt } = req.body;

        // Validate inputs
        if (!comp_code || !amt) {
            throw new ExpressError('comp_code and amt are required', 400);
        }

        // Insert the invoice into the db
        const addedInvoice = await db.query(
            `INSERT INTO invoices (comp_code, amt)
             VALUES ($1, $2)
             RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [comp_code, amt]
        );

        // Return the newly created invoice
        return res.status(201).json({ invoice: addedInvoice.rows[0] });

    } catch (err) {
        return next(err);
    }
});

// **PUT /invoices/:id :** Updates an invoice. If invoice cannot be found, returns a 404.
// Needs to be passed in a JSON body of `{amt}`. Returns: `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}`

router.put('/invoices/:id', async (req, res, next) => {
    try {
        const { id } = req.params; // Extract id from URL
        const { amt } = req.body; // Extract amt from request body

        // Validate input
        if (!amt) {
            throw new ExpressError('Amount is required', 400);
        }

        // Update invoice
        const result = await db.query(
            `UPDATE invoices
             SET amt = $1
             WHERE id = $2
             RETURNING id, comp_code, amt, paid, add_date, paid_date`,
            [amt, id]
        );

        // Check if invoice was found
        if (result.rows.length === 0) {
            throw new ExpressError(`Invoice '${id}' not found`, 404);
        }

        // Return updated invoice
        return res.json({ invoice: result.rows[0] });

    } catch (err) {
        return next(err); // Pass errors to error-handling middleware
    }
});

// **DELETE /invoices/:id :** Deletes an invoice. If invoice cannot be found, returns a 404.
// Returns: `{status: "deleted"}`
router.delete('/invoices/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // Delete invoice from the database
        const result = await db.query(
            `DELETE FROM invoices
             WHERE id = $1
             RETURNING id`,
            [id]
        );

        // If no rows are returned, the invoice doesn't exist
        if (result.rows.length === 0) {
            throw new ExpressError(`Invoice '${id}' not found`, 404);
        }

        // Return success message
        return res.json({ status: "deleted" });

    } catch (err) {
        return next(err); // Pass the error to error-handling middleware
    }
});


// **GET /companies/[code] :** Return obj of company: `{company: {code, name, description, invoices: [id, ...]}}` If the company given cannot be found, this should return a 404 status response..
router.get('/companies/:code', async (req, res, next) => {
    try {
        const {code} = req.params;

        // Query to fetch company details
        const companyResult = await db.query(
            `SELECT code, name, description
             FROM companies
             WHERE code = $1`,
            [code]
        );

        // If no company is found, throw a 404 error
        if (companyResult.rows.length === 0) {
            throw new ExpressError(`Company '${code}' not found`, 404);
        }

        // Query to fetch related invoice IDs
        const invoicesResult = await db.query(
            `SELECT id
             FROM invoices
             WHERE comp_code = $1`,
            [code]
        );

        // Format the response
        const company = companyResult.rows[0];
        const invoices = invoicesResult.rows.map(row => row.id);

        return res.json({
            company: {
                code: company.code,
                name: company.name,
                description: company.description,
                invoices: invoices
            }
        });
    } catch (err) {
        return next(err); 
    }
});

module.exports = router;

