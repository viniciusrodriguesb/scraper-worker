const dtoBuscaProdutos = require('../../application/dtos/search-products.request.dto');
const casoDeUsoBuscaProdutos = require('../../application/use-cases/search-products.use-case');

const criarDtoBuscaProdutos =
    dtoBuscaProdutos.criarDtoBuscaProdutos ||
    dtoBuscaProdutos.createSearchProductsRequestDto;

const buscarProdutosUseCase =
    casoDeUsoBuscaProdutos.buscarProdutosUseCase ||
    casoDeUsoBuscaProdutos.searchProductsUseCase;

async function buscar(req, res, next) {
    try {
        const dtoRequisicao = criarDtoBuscaProdutos(req.query);
        const resultado = await buscarProdutosUseCase(dtoRequisicao);

        return res.status(200).json(resultado);
    } catch (erro) {
        return next(erro);
    }
}

module.exports = {
    buscar,
    search: buscar,
};