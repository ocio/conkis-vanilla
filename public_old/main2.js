const size = 34
const columns = 21
const rows = 21
let tile_id_origin = '5.5'

const board = new Game({ columns, rows })
const unit_id = '1'
const unit_type = UNIT_TYPE.HORSE
board.addUnit({ unit_id, unit_type })
board.setUnitTile({ unit_id, tile_id: tile_id_origin })

const tiles = {}
for (let x = 0; x < columns; ++x) {
    for (let y = 0; y < rows; ++y) {
        const id = `${x}.${y}`
        const div = document.createElement('div')
        const div2 = document.createElement('div')
        document.getElementById('grid').appendChild(div)
        div.appendChild(div2)

        div.onclick = () => changeTile(id)
        div.onmousedown = () => onMouseDown(id)
        div.onmouseup = () => onMouseUp(id)
        div.onmouseover = () => onMouseOver(id)
        div.style.width = `${size}px`
        div.style.height = `${size}px`
        div.style.top = `${size * x + x}px`
        div.style.left = `${size * y + y}px`

        tiles[id] = div
    }
}

function changeTile(tile_id) {
    if (tile_id !== tile_id_origin) {
        const { crossable } = board.tiles[tile_id]
        if (crossable === CROSSABLE_TYPE.WALKABLE) {
            board.setTileCrossable({
                tile_id,
                crossable: CROSSABLE_TYPE.DIAGONABLE
            })
        }
        if (crossable === CROSSABLE_TYPE.DIAGONABLE) {
            board.setTileCrossable({
                tile_id,
                crossable: CROSSABLE_TYPE.OBSTACLE
            })
        }
        if (crossable === CROSSABLE_TYPE.OBSTACLE) {
            board.setTileCrossable({
                tile_id,
                crossable: CROSSABLE_TYPE.WALKABLE
            })
        }
        render()
    }
}

let changing_tile_unit = false
function onMouseDown(tile_id) {
    if (tile_id === tile_id_origin) {
        changing_tile_unit = true
    }
}
function onMouseUp(tile_id) {
    changing_tile_unit = false
}
function onMouseOver(tile_id) {
    if (changing_tile_unit && tile_id !== tile_id_origin) {
        changeUnitTile(tile_id)
    }
}

function changeUnitTile(tile_id) {
    tile_id_origin = tile_id
    board.setUnitTile({ unit_id, tile_id: tile_id_origin })
    render()
}

function render() {
    for (const tile_id in tiles) {
        const { crossable } = board.tiles[tile_id]
        if (crossable === CROSSABLE_TYPE.WALKABLE) tiles[tile_id].className = ''
        if (crossable === CROSSABLE_TYPE.DIAGONABLE)
            tiles[tile_id].className = 'unit'
        if (crossable === CROSSABLE_TYPE.OBSTACLE)
            tiles[tile_id].className = 'wall'
    }
    board.getWalkableTilesByUnit({ unit_id }).tiles.forEach(tile_id => {
        tiles[tile_id].className = 'walkable'
    })
    tiles[tile_id_origin].className = 'origin'
}

render()
