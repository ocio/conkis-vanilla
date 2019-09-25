// const
const size = 33
const columns = 25
const rows = 21
const PLAYER1 = '1'
const PLAYER2 = '2'
const PLAYER3 = '3'
const PLAYER4 = '4'
const tiles = {}
const tiles_list = []
const units = {}
const flags = {}
const players = {
    1: { team_id: 1 },
    2: { team_id: 2 },
    3: { team_id: 1 },
    4: { team_id: 2 }
}

// state
let turn = PLAYER1
let turn_attacks = []
let turn_walks = []
let flag_id_index = 0
let unit_id_index = 0
let unit_selected
let unit_tiles_rangeables = []
let unit_range_selected
let unit_dragging
let flag_dragging

const { Game, EVENT, Elements, UNIT_TYPE } = Conkis
const game = new Game({ columns, rows })
game.playerAdd({ player_id: PLAYER1, team_id: '1' })
game.playerAdd({ player_id: PLAYER3, team_id: '1' })
game.playerAdd({ player_id: PLAYER2, team_id: '2' })
game.playerAdd({ player_id: PLAYER4, team_id: '2' })
game.on(EVENT.UNIT_ADD, ({ unit_id, life, range, movement }) => {
    units[unit_id].range = range
    units[unit_id].movement = movement
    units[unit_id].changeLife(life)
    updateCounter()
})
game.on(EVENT.FLAG_TILE, ({ flag_id, tile_id }) => {
    flags[flag_id].changePosition(tile_id)
})
game.on(EVENT.UNIT_TILE, ({ unit_id, tile_id }) => {
    units[unit_id].changePosition(tile_id)
    // console.log(
    //     tiles[units[unit_id].tile_id].x,
    //     tiles[units[unit_id].tile_id].y
    // )
    const flag_id = getFlagByTile(tile_id)
    if (flag_id !== undefined && !document.getElementById('editing').checked) {
        const { player_id } = units[unit_id]
        game.flagPlayer({ flag_id, player_id })
    }
})

game.on(
    EVENT.UNIT_INFO,
    ({ tile_id, unit_id, range, rangemovement, enemies }) => {
        if (
            unit_selected === undefined ||
            (unit_selected !== undefined && unit_selected !== unit_id)
        ) {
            game.getTilesByRange({ tile_id, range }).forEach(tile_id => {
                const className = tiles[tile_id].className
                if (className === '') {
                    setTileRangeMovementDark(tile_id)
                }
            })
            game.getTilesByRange({ tile_id, range: rangemovement }).forEach(
                tile_id => {
                    const className = tiles[tile_id].className
                    if (className === '') {
                        setTileRangeMovement(tile_id)
                    }
                }
            )
            if (enemies.length > 0) {
                enemies.forEach(({ unit_id, damage, life }) => {
                    units[unit_id].changeDamagetaken(damage, life - damage < 1)
                })
            }
        }
    }
)
game.on(EVENT.UNIT_SELECT, ({ unit_id, walkables, attackables }) => {
    const { range, tile_id } = units[unit_id]
    unit_tiles_rangeables = walkables.slice(0)
    unit_tiles_rangeables.push(tile_id)
    game.getTilesByRange({ tile_id, range }).forEach(tile_id => {
        // if (getUnitByTile(tile_id) === undefined)
        setTileRange(tile_id)
    })
    if (!turn_attacks.includes(unit_id) && !turn_walks.includes(unit_id)) {
        walkables.forEach(tile_id => setTileWalkable(tile_id))
    }
    if (!turn_attacks.includes(unit_id)) {
        attackables.forEach(({ tile_id }) => setTileAttackable(tile_id))
    }
})
game.on(EVENT.UNIT_WALK, ({ unit_id, path, movement }) => {
    if (movement >= path.length) {
        turn_walks.push(unit_id)
        units[unit_id].changePath(path)
    }
})
game.on(EVENT.UNIT_ATTACK, ({ enemies }) => {
    if (enemies.length > 0) {
        turn_attacks.push(unit_selected)
        enemies.forEach(({ life, damage, unit_id }) => {
            const newlife = life - damage
            if (newlife < 1) game.unitDie({ unit_id })
            else game.unitLife({ unit_id, life: newlife })
        })
    }
})

game.on(EVENT.UNIT_LIFE, ({ unit_id, life }) => {
    units[unit_id].changeLife(life)
})
game.on(EVENT.UNIT_DIE, ({ unit_id }) => {
    units[unit_id].die()
    delete units[unit_id]
    updateCounter()
})
game.on(EVENT.FLAG_PLAYER, ({ flag_id, player_id }) => {
    flags[flag_id].changePlayer(player_id)
})

function changeTurn(player_id) {
    clearTiles()
    unit_selected = undefined
    turn_walks = []
    turn_attacks = []
    turn = player_id
    for (let i = 1; i <= 4; i++) {
        document.getElementById('button_turn' + i).disabled =
            player_id === String(i)
    }
}
// http://www.monkeyandcrow.com/blog/drawing_lines_with_css3/

function getRangeMovement({ range, movement }) {
    const rangemovement = [range[0] - movement || 1, range[1] + movement]
    if (rangemovement[0] < 1) {
        rangemovement[0] = 1
    }
    return rangemovement
}
function getDistanceFromPoints({ x1, y1, x2, y2 }) {
    const x = x1 > x2 ? x1 - x2 : x2 - x1
    const y = y1 > y2 ? y1 - y2 : y2 - y1
    return Math.max(x, y)
}
function getUnitsThatAttackThisTile({ tile_id }) {
    const list = []
    for (const unit_id in units) {
        const { range, movement } = units[unit_id]
        const tile = tiles[units[unit_id].tile_id]
        const { x, y } = tiles[tile_id]
        const rangemovement = getRangeMovement({ range, movement })
        const distance = getDistanceFromPoints({
            x1: tile.x,
            y1: tile.y,
            x2: x,
            y2: y
        })

        if (distance >= rangemovement[0] && distance <= rangemovement[1]) {
            list.push({
                unit_id,
                team_id: players[units[unit_id].player_id].team_id
            })
        }
    }
    return list
}
function onClick(tile_id, e) {
    const unit_id = getUnitByTile(tile_id)
    clearTiles()
    clearDamageTaken()
    clearLines()

    if (unit_id !== undefined) {
        const unit = units[unit_id]

        // SELECT
        if (unit.player_id === turn) {
            unit_selected = unit_id
            setTileSelected(tile_id)
            game.unitSelect({ unit_id })
        }

        // ATTACK
        else if (
            unit_selected !== undefined &&
            !turn_attacks.includes(unit_selected)
        ) {
            game.unitAttack({ unit_id: unit_selected, tile_id })
            unit_selected = undefined
        }

        // UNSELECT
        else {
            unit_selected = undefined
        }
    }

    // WALK
    else if (
        unit_selected !== undefined &&
        !turn_attacks.includes(unit_selected) &&
        !turn_walks.includes(unit_selected)
    ) {
        const unit_id = unit_selected
        game.unitWalk({ unit_id, tile_id })
        unit_selected = undefined
    }

    // UNSELECT
    else {
        unit_selected = undefined
    }

    if (e) e.stopPropagation()
}

function onMouseDown(tile_id) {
    unit_dragging = getUnitByTile(tile_id)
    flag_dragging = getFlagByTile(tile_id)
    if (unit_dragging !== undefined) flag_dragging = undefined
}

function onMouseOver(tile_id) {
    clearTilesRangeMovement()
    clearDamageTaken()
    clearLines()
    const editing = document.getElementById('editing').checked
    const unit_id = getUnitByTile(tile_id)

    // MOVING UNIT
    if (editing && unit_dragging !== undefined && unit_id === undefined) {
        clearTiles()
        game.unitTile({ unit_id: unit_dragging, tile_id })
    }
    // MOVING FLAG
    else if (
        editing &&
        flag_dragging !== undefined &&
        getFlagByTile(tile_id) === undefined
    ) {
        clearTiles()
        game.flagTile({ flag_id: flag_dragging, tile_id })
    }

    // RANGE
    else if (unit_selected !== undefined) {
        clearTilesRange()
        const unit = units[unit_selected]
        const player = players[unit.player_id]
        const tile_id_origin =
            unit_tiles_rangeables.includes(tile_id) &&
            !turn_attacks.includes(unit_selected) &&
            !turn_walks.includes(unit_selected)
                ? tile_id
                : unit.tile_id

        if (
            unit_tiles_rangeables.includes(tile_id) &&
            !turn_walks.includes(unit_selected)
        ) {
            getUnitsThatAttackThisTile({ tile_id })
                .filter(({ team_id }) => player.team_id !== team_id)
                .forEach(({ unit_id }) => {
                    const unit = units[unit_id]
                    const tile = tiles[tile_id]
                    const tile_enemy = tiles[unit.tile_id]
                    const size_half = size / 2
                    const x1 = size * tile.x + size_half + tile.x
                    const y1 = size * tile.y + size_half + tile.y
                    const x2 = size * tile_enemy.x + size_half + tile_enemy.x
                    const y2 = size * tile_enemy.y + size_half + tile_enemy.y
                    createLine(x1, y1, x2, y2)
                })
        }

        game.unitInfo({ unit_id: unit_selected })
        game.getTilesByRange({
            tile_id: tile_id_origin,
            range: unit.range
        }).forEach(tile_id => {
            if (tiles[tile_id].className === '') {
                setTileRange(tile_id)
            }
        })
    }

    // MOVEMENT-RANGE
    if (unit_id !== undefined) {
        game.unitInfo({ unit_id })
    }
}
function onMouseUp(tile_id, e) {
    unit_dragging = undefined
    flag_dragging = undefined
}

function onRightClick(tile_id, e) {
    e.preventDefault()
    if (document.getElementById('editing').checked) {
        const flag_id = getFlagByTile(tile_id)
        const unit_id = getUnitByTile(tile_id)
        if (flag_id !== undefined) {
            flags[flag_id].remove()
            delete flags[flag_id]
        } else if (unit_id !== undefined) {
            game.unitDie({ unit_id })
        }
    }
    return false
}

function getUnitByTile(tile_id) {
    for (const unit_id in units) {
        if (units[unit_id].tile_id === tile_id) return unit_id
    }
}

function getFlagByTile(tile_id) {
    for (const flag_id in flags) {
        if (flags[flag_id].tile_id === tile_id) return flag_id
    }
}

function unitAdd(type, player_id) {
    clearTiles()
    unit_selected = undefined
    player_id = player_id.toString()
    const tile_id = getNextTileId(
        player_id === PLAYER2 || player_id === PLAYER4
    )
    const unit_id = (unit_id_index++).toString()
    const unit_type = type.toUpperCase()
    const unit = createUnit({ img: `img/${type}${player_id}.png` })
    unit.player_id = player_id
    unit.unit_id = unit_id
    unit.unit_type = unit_type
    units[unit_id] = unit
    game.unitAdd(createUnitObject({ unit_id, unit_type }))
    game.unitPlayer({ unit_id, player_id })
    game.unitTile({ unit_id, tile_id })
}

function flagAdd() {
    clearTiles()
    const tile_id =
        tiles_list[Math.floor(tiles_list.length / 2) + flag_id_index]
    const flag_id = (flag_id_index++).toString()
    flags[flag_id] = createFlag()
    game.flagAdd({ flag_id })
    game.flagTile({ flag_id, tile_id })
}

function createUnit({ img }) {
    const div = document.createElement('div')
    div.className = 'unit'
    div.style.width = `${size}px`
    div.style.height = `${size}px`
    div.style.background = `url('${img}') center center / 100% 100%`
    const life = document.createElement('span')
    life.className = 'life'
    div.appendChild(life)
    const damagetaken = document.createElement('span')
    damagetaken.className = 'damagetaken'
    div.appendChild(damagetaken)
    document.getElementById('grid').appendChild(div)
    const object = {
        changePosition: tile_id => {
            const { x, y } = tiles[tile_id]
            object.tile_id = tile_id
            div.style.left = `${size * x + x}px`
            div.style.top = `${size * y + y}px`
        },
        changePath: path => {
            path.unshift(object.tile_id)
            ;(function loop(index) {
                const tile1 = tiles[path[index]]
                const tile2 = tiles[path[index + 1]]
                const originx = size * tile1.x + tile1.x
                const originy = size * tile1.y + tile1.y
                const destinyx = size * tile2.x + tile2.x
                const destinyy = size * tile2.y + tile2.y
                new TWEEN.Tween({ x: originx, y: originy })
                    .to(
                        {
                            x: destinyx,
                            y: destinyy
                        },
                        250
                    )
                    .onUpdate(o => {
                        div.style.left = `${o.x}px`
                        div.style.top = `${o.y}px`
                    })
                    .onComplete(() => {
                        if (index + 1 < path.length - 1) loop(index + 1)
                        else {
                            const tile_id = path[path.length - 1]
                            game.unitTile({ unit_id: object.unit_id, tile_id })
                            onClick(tile_id)
                        }
                    })
                    .start()
            })(0)
        },
        changeLife: l => {
            life.innerHTML = l
        },
        changeDamagetaken: (damage, death = false) => {
            if (String(damage).length === 0) {
                damagetaken.style.display = 'none'
            } else {
                damagetaken.style.display = 'block'
                damagetaken.innerHTML = `-${damage}`
                damagetaken.style.color = death
                    ? 'black'
                    : damage > 1
                    ? 'red'
                    : 'goldenrod'
            }
        },
        die: () => {
            document.getElementById('grid').removeChild(div)
        }
    }
    return object
}

function createFlag() {
    const div = document.createElement('div')
    div.className = 'flag'
    div.style.width = `${size}px`
    div.style.height = `${size}px`
    div.style.background = `url('img/flag.png') center center / 50% 50% no-repeat`
    document.getElementById('grid').appendChild(div)
    const object = {
        changePosition: tile_id => {
            const { x, y } = tiles[tile_id]
            object.tile_id = tile_id
            div.style.top = `${size * x + x}px`
            div.style.left = `${size * y + y}px`
        },
        changePlayer: player_id => {
            div.style.backgroundImage = `url('img/flag${player_id}.png')`
        },
        remove: () => {
            document.getElementById('grid').removeChild(div)
        }
    }
    return object
}

function createUnitObject({ unit_type, unit_id }) {
    let unit
    switch (unit_type) {
        case UNIT_TYPE.TOWER:
            unit = Elements.Tower(unit_id)
            break
        case UNIT_TYPE.CATAPULT:
            unit = Elements.Catapult(unit_id)
            break
        case UNIT_TYPE.HORSE:
            unit = Elements.Horse(unit_id)
            break
        case UNIT_TYPE.SPEARMAN:
            unit = Elements.Spearman(unit_id)
            break
        case UNIT_TYPE.AXEMAN:
            unit = Elements.Axeman(unit_id)
            break
        case UNIT_TYPE.ARCHER:
            unit = Elements.Archer(unit_id)
            break
        case UNIT_TYPE.SLINGER:
            unit = Elements.Slinger(unit_id)
            break
        case UNIT_TYPE.HORSEARCHER:
            unit = Elements.HorseArcher(unit_id)
            break
    }

    return unit
}

function updateCounter() {
    const counter = {
        1: 0,
        2: 0,
        3: 0,
        4: 0
    }
    for (const unit_id in units) {
        counter[units[unit_id].player_id] += 1
    }
    for (const player_id in counter) {
        document.getElementById(`counter${player_id}`).innerHTML =
            counter[player_id]
    }
}

function getNextTileId(inverted = false) {
    for (let i = 0; i < tiles_list.length; ++i) {
        const index = inverted ? tiles_list.length - i - 1 : i
        if (getUnitByTile(tiles_list[index]) === undefined)
            return tiles_list[index]
    }
}

function createGrid() {
    for (let y = 0; y < rows; ++y) {
        for (let x = 0; x < columns; ++x) {
            const id = `${x}.${y}`
            const div = document.createElement('div')
            const div2 = document.createElement('div')
            div.x = x
            div.y = y
            document.getElementById('grid').appendChild(div)
            div.appendChild(div2)

            div.onclick = e => onClick(id, e)
            div.onmousedown = e => onMouseDown(id, e)
            div.onmouseup = e => onMouseUp(id, e)
            div.onmouseover = e => onMouseOver(id, e)
            div.oncontextmenu = e => onRightClick(id, e)
            div.style.width = `${size}px`
            div.style.height = `${size}px`
            div.style.left = `${size * x + x}px`
            div.style.top = `${size * y + y}px`

            tiles_list.push(id)
            tiles[id] = div
        }
    }
}
createGrid()

function setTileWalkable(tile_id) {
    tiles[tile_id].className = 'walkable'
}
function setTileAttackable(tile_id) {
    tiles[tile_id].className = 'attackable'
}
function setTileRange(tile_id) {
    tiles[tile_id].className = 'range'
}
function setTileSelected(tile_id) {
    tiles[tile_id].className = 'selected'
}
function setTileRangeMovement(tile_id) {
    tiles[tile_id].className = 'rangemovement'
}
function setTileRangeMovementDark(tile_id) {
    tiles[tile_id].className = 'rangemovementdark'
}
function clearTiles() {
    for (const tile_id in tiles) {
        tiles[tile_id].className = ''
    }
}
function clearTilesRange() {
    for (const tile_id in tiles) {
        if (tiles[tile_id].className === 'range') tiles[tile_id].className = ''
    }
}
function clearTilesRangeMovement() {
    for (const tile_id in tiles) {
        if (
            tiles[tile_id].className === 'rangemovement' ||
            tiles[tile_id].className === 'rangemovementdark'
        )
            tiles[tile_id].className = ''
    }
}
function clearDamageTaken() {
    for (const unit_id in units) {
        units[unit_id].changeDamagetaken('')
    }
}

function animate(time) {
    requestAnimationFrame(animate)
    TWEEN.update(time)
}
requestAnimationFrame(animate)

document.body.onclick = function() {
    clearTiles()
    clearDamageTaken()
    clearLines()
    unit_selected = undefined
}

function clearLines() {
    const wrap = document.getElementById('lines')
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild)
}

function createLine(x1, y1, x2, y2) {
    // const length = Math.round(
    //     Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
    // )
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    // svg.setAttribute('width', size * (columns + 1))
    // svg.setAttribute('height', size * (rows + 1))
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', x1)
    line.setAttribute('y1', y1)
    line.setAttribute('x2', x2)
    line.setAttribute('y2', y2)
    svg.appendChild(line)
    document.getElementById('lines').appendChild(svg)
    return svg
}

// function createLine(x1, y1, x2, y2) {
//     const length = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
//     const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
//     const line = document.createElement('div')
//     line.style.position = `absolute`
//     line.style.transform = `rotate(${angle}deg)`
//     line.style.width = `${length}px`
//     line.style.left = `${x1}px`
//     line.style.top = `${y1}px`
//     document.getElementById('grid').appendChild(line)

//     // const line = $('<div>')
//     //     .appendTo('#page')
//     //     .addClass('line')
//     //     .css({
//     //         position: 'absolute',
//     //         transform: transform
//     //     })
//     //     .width(length)
//     //     .offset({ left: x1, top: y1 })

//     return line
// }
