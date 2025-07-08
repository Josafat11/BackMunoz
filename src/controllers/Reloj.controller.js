    
    // relog controller
    import { PrismaClient } from "@prisma/client";
    const prisma = new PrismaClient();

    /**
     * Obtener productos con poco stock (por debajo de cierto umbral)
     */
    export const obtenerProductosConPocoStock = async (req, res) => {
    try {
        const UMBRAL_STOCK = 5; // Puedes ajustar este valor según lo que se considere "poco"

        const productos = await prisma.productos.findMany({
        where: {
            stock: {
            lte: UMBRAL_STOCK,
            },
        },
        select: {
            id: true,
            name: true,
            stock: true,
            description: true,
            price: true,
            category: true,
        },
        });

        return res.status(200).json(productos);
    } catch (error) {
        console.error("Error al obtener productos con poco stock:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
    };

    /**
     * Obtener pedidos filtrados por estado
     * Ejemplo de query: /api/reloj/pedidos?estado=EN_PROCESO
     */
    export const obtenerPedidosPorEstado = async (req, res) => {
    try {
        const { estado } = req.query;

        // Validar que el estado sea uno de los válidos
        const estadosValidos = ["EN_PROCESO", "EN_CAMINO", "ENTREGADO"];
        if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ message: "Estado de pedido inválido" });
        }

        const pedidos = await prisma.pedido.findMany({
        where: {
            estado: estado,
        },
        include: {
            cliente: {
            select: {
                id: true,
                name: true,
                lastname: true,
            },
            },
            items: {
            include: {
                producto: {
                select: {
                    id: true,
                    name: true,
                },
                },
            },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        });

        return res.status(200).json(pedidos);
    } catch (error) {
        console.error("Error al obtener pedidos por estado:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
    };
