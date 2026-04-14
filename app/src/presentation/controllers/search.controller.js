const {
    createSearchProductsRequestDto,
} = require('../../application/dtos/search-products.request.dto');
const {
    searchProductsUseCase,
} = require('../../application/use-cases/search-products.use-case');

async function search(req, res, next) {
    try {
        const requestDto = createSearchProductsRequestDto(req.query);
        const result = await searchProductsUseCase(requestDto);

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    search,
};