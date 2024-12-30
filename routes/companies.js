/*
## **Add Company Routes**

- Create ***routes/companies.js*** with a router in it.

- All routes in this file should be found under *companies/*.

- All routes here will respond with JSON responses. These responses will be in an object format where the value is the data from the database.

So, for example, the “get list of companies should return”:
{companies: [{code, name}, ...]}

Assuming result is the result from your query, you could produce this with a line like:
return res.json({companies: result.rows})

- These routes need to be given data in JSON format, not the standard “url-encoded form body” — so you’ll need to make sure that your app.js includes the middleware to parse JSON.

------*/
const express = require('express');
const ExpressError = require('../expressError');
const db = require('../db');

let router = new express.Router();

//ROUTES 


// **GET /companies :** Returns list of companies, like `{companies: [{code, name}, ...]}`
router.get('/companies', async (req, res, next) => {
    try {
        const results = await db.query(
            `SELECT code, name
            FROM companies
            ORDER BY name ASC`
        );
        return res.json({'companies': results.rows});
    } catch (err) {
        return next(err);
    }
});

/* **GET /companies/[code] :** Return obj of company: `{company: {code, name, description}}`
If the company given cannot be found, this should return a 404 status response. */
router.get('/companies/:code', async (req, res, next) => {
    //Get the param 'code' from the url
    const code = req.params.code;

    try {
        const companyResult = await db.query(
            `SELECT code, name, description
            FROM companies
            WHERE code = $1`, [code]
        );

        if (companyResult.rows.length === 0) {
            const error = new ExpressError(`Company '${code}' not found`, 404);
            return next(error);
        }
        return res.json({'company': companyResult.rows[0]});

    } catch (err) {
        return next(err);
    }
});

/*
**POST /companies :** Adds a company. Needs to be given JSON like: `{code, name, description}` Returns obj of new company:  `{company: {code, name, description}}`
*/
router.post('/companies', async (req, res, next) => {
    try {
        const {code, name, description} = req.body;

        // Insert the company into the db
        const addedCompany = await db.query(
            `INSERT INTO companies (code, name, description)
            VALUES ($1, $2, $3)
            RETURNING code, name, description`, 
            [code, name, description]
        );

        return res.status(201).json({'company': addedCompany.rows[0]});

    } catch (err) {
        return next(err);
    }
});

/*
**PUT /companies/[code] :** Edit existing company. Should return 404 if company cannot be found.
Needs to be given JSON like: `{name, description}` Returns update company object: `{company: {code, name, description}}`
*/
router.put('/companies/:code', async (req, res, next) => {
    try{
        const {code} = req.params;
        const {name, description} = req.body;

        // Validate inputs
        if (!name || !description) {
            throw new ExpressError('Name and description required', 400);
        }

        // Update company in the db
            const result = await db.query(
                `UPDATE companies SET name = $1, description = $2
                WHERE code = $3
                RETURNING code, name, description`,
                [name, description, code]
            );
        
        // If not company found
        if (result.rows.length === 0) {
            throw new ExpressError(`Company with code '${code}' not found`, 404);
        }

        // Return updated company
        return res.json({'company': result.rows[0]});
        
    } catch (err) {
        return next(err);
    }
});

/*
**DELETE /companies/[code] :** Deletes company. Should return 404 if company cannot be found.
Returns `{status: "deleted"}` */
router.delete('/companies/:code', async (req, res, next) => {
    try {
        const { code } = req.params;

        // Delete the company from the database
        const result = await db.query(
            `DELETE FROM companies
             WHERE code = $1
             RETURNING code`,
            [code]
        );

        // If no rows were returned, the company doesn't exist
        if (result.rows.length === 0) {
            throw new ExpressError(`Company with code '${code}' not found`, 404);
        }

        // Return success message
        return res.json({status: 'deleted'})

    } catch (err) {
        return next(err); 
    }
});

module.exports = router;
