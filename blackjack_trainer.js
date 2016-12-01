'use strict';

const suits = [ 'Spades', 'Hearts', 'Diamonds', 'Clubs' ]
const cardTypes = [ 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace' ]
const cardValues = {
    'Two': 2,
    'Three': 3,
    'Four': 4,
    'Five': 5,
    'Six': 6,
    'Seven': 7,
    'Eight': 8,
    'Nine': 9,
    'Ten': 10,
    'Jack': 10,
    'Queen': 10,
    'King': 10,
    'Ace': 11 // 1 or 11, but use 11 here to keep the interface the same
}

// Returns the shuffled cards
function shuffleDeck(deck) {
    var shuffledDeck = [];
    for(var i = 0; i < deck.length; i++) {
        var j = Math.floor(Math.random() * (i + 1));
        if(j != i) {
            shuffledDeck[i] = shuffledDeck[j];
        }
        shuffledDeck[j] = deck[i];
    }
    return shuffledDeck;
}

// Creates a new deck and shuffles it.
// The deck is an array of card description hashes, e.g. [{'suit': 'Spades', 'card': 'Ace'}, {'suit': 'Hearts', 'card': 'Two'}]
// where index 0 is the bottom of the deck, and cards should only ever be `pop`ped off the top.
function newDeck() {
    var deck = []
    suits.forEach(function (suit, suitIndex) {
        cardTypes.forEach(function(card, cardIndex) {
            var cardInfo = {"suit": suit, "card": card};
            deck.push(cardInfo);
        })
    })
    var shuffledDeck = shuffleDeck(deck);

    // Pop the 'burn' card off the deck
    shuffledDeck.pop();
    return shuffledDeck;
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'SSML',
            ssml: `<speak>${output}</speak>`
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'SSML',
                ssml: `<speak>${repromptText}</speak>`,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    let sessionAttributes = {
        "wins": 0,
        "losses": 0,
        "ties": 0,
        "correctDecisions": 0,
        "incorrectDecisions": 0
    };

    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to blackjack trainer. Say deal to start a new game. ';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Say deal to start a new game.';
    const shouldEndSession = false;

    callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function unimplementedAbilityResponse(intent, session, callback) {
    const available_actions = availableActions(session.attributes.hand);

    let speechOutput = `I'm sorry, I am still learning how to do that. `;
    speechOutput += sayAvailableActions(session.attributes.hand, available_actions);
    let repromptText = '';

    callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function winMoneyResponse(session, callback) {
    const cardTitle = 'CA$H MON3Y';
    const speechOutput = "Wow, you really need someone to stroke your ego, don't you." + '<break time="1ms"/>' +
            "Then again, the Cubs won the world series and donald trump is president elect, so I suppose anything is possible.";
    const repromptText = '';
    const shouldEndSession = false;

    callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getStats(session, tense) {
    tense = tense || 'present';
    const wins = session.attributes.wins;
    const ties = session.attributes.ties;
    const hands = wins + ties + session.attributes.losses;
    var speechOutput = "";

    if(hands === 0) {
        if(tense == 'present') {
            speechOutput += 'You have not played any games yet. Say deal to start a new hand.';
        } else {
            speechOutput += 'You did not play any games.';
        }
    } else {
        let winStatsSpeech = `You have won ${wins} out of ${hands} hands. `;
        if(ties > 0) {
            winStatsSpeech += `${ties} of the games were tied.`
        }

        const decisions = session.attributes.correctDecisions + session.attributes.incorrectDecisions;
        const correctPercentage = ((session.attributes.correctDecisions / decisions) * 100);
        const correctFloat = Math.floor((correctPercentage % 1) * 100);
        var decisionStatsSpeech = 'Your decisions were correct ' + Math.floor(correctPercentage);
        if(correctFloat > 0) {
            decisionStatsSpeech += ` point <say-as interpret-as="digits">${correctFloat}</say-as>`;
        }
        decisionStatsSpeech += ' percent of the time.';

        speechOutput = `${winStatsSpeech} ${decisionStatsSpeech}`;
    }
    return speechOutput;
}

function getStatsResponse(session, callback) {
    const cardTitle = 'Stats';

    var speechOutput = getStats(session);

    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = speechOutput;
    const shouldEndSession = false;

    callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(session, callback) {
    const cardTitle = 'Game Over';
    let speechOutput = 'Thank you for playing! ';
    speechOutput += getStats(session, 'past');
    speechOutput += ' Goodbye.';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function cardText(card, style) {
    style = style || 'long';
    let text = '';
    switch(card.card) {
        case 'Eight':
        case 'Ace':
            text += 'an';
            break;
        default:
            text += 'a';
            break;
    }
    text += ` ${card.card} `;
    if(style == 'long') { text += `of ${card.suit}` };
    return text;
}

function cardsText(cards, style) {
    style = style || 'long';
    let text = cardText(cards[0]);
    for(var i=1; i < cards.length - 1; i++) {
        text += `, ${cardText(cards[i], style)}`;
    }
    text += ` and ${cardText(cards[cards.length - 1], style)}`;
    return text;
}

function handSummary(hand, tense) {
    tense = tense || 'present';
    let speech = ' you ';
    speech += (tense == 'present') ? 'have' : 'had';
    speech += ' ' + cardsText(hand.player);
    speech += ' against the dealer\'s ';
    speech += ` ${hand.dealer[1].card}. `;
    return speech;
}

function handDetails(hand, tense) {
    tense = tense || 'present';
    let speech = handSummary(hand, tense);
    speech += suggestNextActions(hand, tense);
    return speech;
}

function cardsTotal(cards) {
    const card_values = cardsToValues(cards);
    const card_total = card_values.reduce(
            function(sum, value){
                return sum + value;
            }, 0);

    return card_total;
}

function cardsScore(cards) {
    const card_total = cardsTotal(cards);

    if(cards.length == 2 && card_total == 21) {
        return 'blackjack';
    } else if(card_total > 21) {
        return 'busted';
    } else {
        return `${card_total}`;
    }
}

function handFinishedDetails(hand) {
    var speech = '';

    // speech += `The card in the hole was ${cardText(hand.dealer[0])}.`;
    if(hand.dealer.length > 2) {
        let dealer_hit_cards = hand.dealer.slice(2);
        speech += ` I had ${cardText(hand.dealer[0])} in the hole, and`;
        speech += ` dealt ${cardsText(dealer_hit_cards, 'short')}.`; //<break time="1ms"/>
    } else {
        speech += `I had ${cardText(hand.dealer[0])} in the hole.`;
    }


    let player_final_result = cardsScore(hand.player);
    if(player_final_result == 'busted') {
        speech += ' Your hand went bust. ';
    } else {
        speech += ` You ended the hand with ${player_final_result} `;
    }

    let dealer_final_result = cardsScore(hand.dealer);
    if(dealer_final_result == 'busted') {
        speech += 'and the dealer went bust. ';
    } else {
        speech += `against the dealer's ${dealer_final_result}. `;
    }

    speech += ' ' + suggestNextActions(hand);
    return speech;
}

function prepareDeck(session) {
    var deck = session.attributes.deck;
    if(!deck || (deck.length < 23)) {
        session.attributes.deck = newDeck();
    }

    return session.attributes.deck;
}

function dealHand(session) {
    var deck = prepareDeck(session);

    let newHand = {
        "dealer":  [],
        "player": [],
        "action_log": [],
        "finished": false
    }

    // Deal the cards in correct order
    newHand['player'].push(deck.pop());
    newHand['dealer'].push(deck.pop());
    newHand['player'].push(deck.pop());
    newHand['dealer'].push(deck.pop());

    return newHand;
}

function canDealHand(session) {
    return (!session.attributes.hand || session.attributes.hand.finished)
}

function cardsLowTotal(cards) {
    let total = 0;
    cards.forEach(function(card, index) {
        if(card.card == 'Ace') {
            total += 1;
        } else {
            total += cardValues[card.card];
        }
    });
    return total;
}

function cardsHighTotal(cards) {
    let total = 0;
    cards.forEach(function(card, index) {
        if(card.card == 'Ace') {
            total += 11;
        } else {
            total += cardValues[card.card];
        }
    });
    return total;
}

function areCardsBustedHigh(cards) {
    return (cardsHighTotal(cards) > 21);
}

function isHandBusted(cards) {
    return (cardsLowTotal(cards) > 21);
}

function availableActions(hand) {
    // hit, stand, double, split
    const playerCards = hand.player;
    let availableActions = [];

    if(!hand.finished && !isHandBusted(playerCards)) {
        availableActions.push('Hit');
        availableActions.push('Stand');

        if (playerCards.length == 2) {
            availableActions.push('Double Down');

            var card1 = playerCards[0].card;
            var card2 = playerCards[1].card;
            if (card1 == card2) {
                availableActions.push('Split');
            }
        }
    }

    return availableActions;
}

function suggestNextActions(hand) {
    let actions = availableActions(hand);
    const numActions = actions.length;

    if(numActions > 0) {
        let text = `You can ${actions[0]}`;

        if(numActions > 1) {
            for (var i = 1; i < numActions - 1; i++) {
                text += `, ${actions[i]}`
            }
            var lastAction = actions[numActions - 1];
            text += `, or ${lastAction}`
        }

        return text;
    }

    return '<break time="1ms"/>Say deal to start a new hand.';
}

/**
 * Deals cards for a new hand, or responds with current hand information if it has already been dealt.
 */
function dealCards(intent, session, callback) {
    const cardTitle = intent.name;
    const shouldEndSession = false;

    if(canDealHand(session)) {
        var hand = dealHand(session);
        session.attributes['hand'] = hand;
    }

    // TODO: Peek for dealer blackjack
    let speechOutput = handDetails(hand);

    callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, speechOutput, shouldEndSession));
}

function shouldDealerHit(dealerCards) {
    const highTotal = cardsHighTotal(dealerCards);
    const lowTotal = cardsLowTotal(dealerCards);

    if((highTotal < 17) || (highTotal > 21 && lowTotal < 17)) {
        return true;
    } else {
        return false;
    }
}

function hit(cards, deck) {
    cards.push(deck.pop());
}

function completeDealerHand(hand, deck) {
    let dealerCards = hand.dealer;
    while(shouldDealerHit(dealerCards)) {
        hit(dealerCards, deck);
    }
}

function anyWrongMoves(hand) {
    return !hand.action_log.every(function(log) {
        return !(log.reason);
    });
}

function isBlackjack(cards) {
    return (cards.length == 2 && maxUnbustedValue(cards) == 21)
}

function isTied(hand) {
    if (isBlackjack(hand.player) || isBlackjack(hand.dealer)) {
        if(isBlackjack(hand.player) && isBlackjack(hand.dealer)) {
            return true;
        } else {
            return false;
        }
    } else if(maxUnbustedValue(hand.player) == maxUnbustedValue(hand.dealer)) {
        return true;
    } else {
        return false;
    }
}

function getWinner(hand) {
    if(playerBusted(hand)) {
        return 'dealer';
    } else if(dealerBusted(hand)) {
        return 'player';
    } else if(isTied(hand)) {
        return 'tie';
    } else if(isBlackjack(hand.player)) {
        return 'player';
    } else if(isBlackjack(hand.dealer)) {
        return 'dealer';
    }
    return (maxUnbustedValue(hand.player) > maxUnbustedValue(hand.dealer)) ? 'player' : 'dealer'
}

function dealerBusted(hand) {
    return isHandBusted(hand.dealer);
}

function playerBusted(hand) {
    return isHandBusted(hand.player);
}

function getWinningMessage(hand) {
    let message = 'Congratulations, ';
    if (dealerBusted(hand)) {
        message += 'the dealer busted and ';
    }
    message += 'you won the hand. ';
    return message;
}

function getLosingMessage(hand) {
    let message = 'Sorry, ';
    message += playerBusted(hand) ? 'you busted.' : 'the dealer beat your hand.';
    return message;
}

function summarizeHand(hand) {
    let message = '';
    const winner = getWinner(hand);

    switch(winner) {
        case 'player':
            message += ' ' + getWinningMessage(hand);
            break;
        case 'dealer':
            message += ' ' + getLosingMessage(hand);
            break;
        default:
            message += ' The hand ended in a tie.';
    }

    if(anyWrongMoves(hand)) {
        hand.action_log.forEach(function (log, index) {
            if(log.reason) {
                message += ' ' + log.reason;
            }
        });
    }

    message += ' ' + handFinishedDetails(hand);

    return message;
}

function finishHand(hand, session) {
    hand.finished = true;
    let winner = getWinner(hand);
    switch(winner) {
        case 'player':
            session.attributes.wins += 1;
            break;
        case 'dealer':
            session.attributes.losses += 1;
            break;
        default:
            session.attributes.ties += 1;
    }

    return summarizeHand(hand);
}

function performStand(session) {
    let hand = session.attributes.hand;
    let deck = session.attributes.deck;

    completeDealerHand(hand, deck);

    return finishHand(hand, session);
}

function hitPlayer(hand, deck) {
    hit(hand.player, deck);
}

function performHit(session) {
    let hand = session.attributes.hand;
    let deck = session.attributes.deck;

    hitPlayer(hand, deck);

    if(playerBusted(hand)) {
        return finishHand(hand, session)
    } else {
        return handDetails(hand);
    }
}

function performDouble(session) {
    let hand = session.attributes.hand;
    let deck = session.attributes.deck;

    hitPlayer(hand, deck);

    if(!playerBusted(hand)) {
        completeDealerHand(hand, deck);
    }

    return finishHand(hand, session)
}

function cardsToValues(cards) {
    let values = [];
    cards.forEach(function (card, index) {
        values.push(cardValues[card.card]);
    });
    return values;
}

function maxUnbustedValue(cards) {
    if(areCardsBustedHigh(cards)) {
        return cardsLowTotal(cards)
    } else {
        return cardsHighTotal(cards)
    }
}

function correctActionForHand(hand) {
    const dealer_up_card = hand.dealer[1];
    const dealer_up_card_value = cardValues[dealer_up_card.card];
    const player_cards = hand.player;
    const player_card_values = cardsToValues(player_cards);
    const max_unbusted_value = maxUnbustedValue(player_cards);

    if(player_cards.length == 2) {
        if(player_cards[0].card == player_cards[1].card) {
            switch(player_card_values[0]) {
                case 2:
                case 3:
                    switch(dealer_up_card_value) {
                        case 8:
                        case 9:
                        case 10:
                        case 11:
                            return 'Hit';
                        default:
                            return 'Split';
                    }
                case 4:
                    switch(dealer_up_card_value) {
                        case 5:
                        case 6:
                            return 'Split';
                        default:
                            return 'Hit';
                    }
                case 5:
                    switch(dealer_up_card_value) {
                        case 10:
                        case 11:
                            return 'Hit';
                        default:
                            return 'Double Down';
                    }
                case 6:
                    return 'Hit';
                case 7:
                    switch(dealer_up_card_value) {
                        case 8:
                        case 9:
                        case 10:
                        case 11:
                            return 'Hit';
                        default:
                            return 'Split';
                    }
                case 8:
                    return 'Split';
                    break;
                case 9:
                    switch(dealer_up_card_value) {
                        case 7:
                        case 10:
                        case 11:
                            return 'Stand';
                        default:
                            return 'Split';
                    }
                case 10:
                    return 'Stand';
                case 11:
                    return 'Split';
            }
        } else if(player_card_values[0] == 11 || player_card_values[1] == 11) {
            let non_ace_card_value = null;
            if(player_card_values[0] == 11) {
                non_ace_card_value = player_card_values[1];
            } else {
                non_ace_card_value = player_card_values[0];
            }

            switch(non_ace_card_value) {
                case 2:
                case 3:
                    switch(dealer_up_card_value) {
                        case 5:
                        case 6:
                            return 'Double Down';
                        default:
                            return 'Hit';
                    }
                case 4:
                case 5:
                    switch(dealer_up_card_value) {
                        case 4:
                        case 5:
                        case 6:
                            return 'Double Down';
                        default:
                            return 'Hit';
                    }
                case 6:
                    switch(dealer_up_card_value) {
                        case 3:
                        case 4:
                        case 5:
                        case 6:
                            return 'Double Down';
                        default:
                            return 'Hit';
                    }
                case 7:
                    switch(dealer_up_card_value) {
                        case 7:
                        case 8:
                            return 'Stand';
                        case 9:
                        case 10:
                        case 11:
                            return 'Hit';
                        default:
                            return 'Double Down';
                    }
                case 8:
                case 9:
                    switch(dealer_up_card_value) {
                        case 2:
                        case 3:
                        case 4:
                        case 5:
                        case 6:
                            return 'Double Down';
                        default:
                            return 'Stand';
                    }
            }
        }
    }

    if(max_unbusted_value <= 8) {
        return 'Hit';
    } else if (max_unbusted_value >= 17) {
        return 'Stand';
    } else {
        switch (max_unbusted_value) {
            case 9:
                switch(dealer_up_card_value) {
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                        return 'Double Down';
                    default:
                        return 'Hit';
                }
            case 10:
                switch(dealer_up_card_value) {
                    case 10:
                    case 11:
                        return 'Hit';
                    default:
                        return 'Double Down';
                }
            case 11:
                switch(dealer_up_card_value) {
                    case 11:
                        return 'Hit';
                    default:
                        return 'Double Down';
                }
            case 12:
                switch(dealer_up_card_value) {
                    case 4:
                    case 5:
                    case 6:
                        return 'Stand';
                    default:
                        return 'Hit';
                }
            case 13:
            case 14:
            case 15:
            case 16:
                switch(dealer_up_card_value) {
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                        return 'Stand';
                    default:
                        return 'Hit';
                }
        }
    }
}

function actionPastTense(action) {
    switch(action) {
        case 'Stand':
            return 'Stood';
        case 'Double Down':
            return 'Doubled Down';
        default:
            return action;
    }
}

function logAction(cardTitle, session) {
    let hand = session.attributes.hand;
    const correct_action = correctActionForHand(hand);
    let action_log = {
        player_action: cardTitle,
        correct_action: correct_action
    };

    let reason = null;
    if(correct_action == cardTitle) {
        session.attributes.correctDecisions += 1;
    } else {
        session.attributes.incorrectDecisions += 1;
        action_log['reason'] = `You ${actionPastTense(cardTitle)} when ${handSummary(hand, 'past')} In this scenario, you should have ${actionPastTense(correct_action)} instead.`
    }

    hand.action_log.push(action_log);
}

function sayAvailableActions(hand, available_actions) {
    if(available_actions.length > 0) {
        return suggestNextActions(hand);
    } else {
        return 'Say deal to start a new hand.';
    }
}

function currentStatus(intent, session, callback) {
    const cardTitle = intent.name;
    const shouldEndSession = false;

    let speechOutput = '';
    let repromptText = '';
    let hand = session.attributes.hand;

    if(hand) {
        if(hand.finished) {
            speechOutput += handFinishedDetails(hand);
        } else {
            speechOutput += handDetails(hand);//sayAvailableActions(session.attributes.hand, available_actions);
        }
    } else {
        speechOutput += "You haven't played any games yet. Say deal to start a game."
    }

    callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function performAction(actionName, session, callback) {
    const cardTitle = actionName;
    const shouldEndSession = false;

    let speechOutput = '';
    let repromptText = '';

    const available_actions = availableActions(session.attributes.hand)

    if(available_actions.indexOf(cardTitle) >= 0) {
        logAction(cardTitle, session) // Determine if user's action was correct or not and log it

        switch(cardTitle) {
            case 'Stand':
                speechOutput += performStand(session);
                repromptText = speechOutput;
                break;
            case 'Hit':
                speechOutput += performHit(session);
                repromptText = speechOutput;
                break;
            case 'Double Down':
                speechOutput += performDouble(session);
                repromptText = speechOutput;
                break;
            default:
                speechOutput += `I'm very sorry, I don't know how to ${cardTitle} yet. `
                speechOutput += sayAvailableActions(session.attributes.hand, available_actions);
        }
    } else {
        speechOutput = `Sorry, you can't ${cardTitle} right now. `;
        speechOutput += sayAvailableActions(session.attributes.hand, available_actions);
    }


    callback(session.attributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    switch(intentName) {
        case 'Deal':
            dealCards(intent, session, callback);
            break;
        case 'HowAmIDoing':
            getStatsResponse(session, callback);
            break;
        case 'WinMoney':
            winMoneyResponse(session, callback);
            break;
        case 'WhatAreMyOptions':
            currentStatus(intent, session, callback);
            break;
        case 'AMAZON.HelpIntent':
            getWelcomeResponse(callback);
            break;
        case 'AMAZON.StopIntent':
        case 'AMAZON.CancelIntent':
        case 'Stop':
            handleSessionEndRequest(session, callback);
            break;
        case 'Stand':
        case 'Hit':
        case 'Split':
            performAction(intent.name, session, callback);
            break;
        case 'Double':
            performAction('Double Down', session, callback);
            break;
        default:
            unimplementedAbilityResponse(intent, session, callback);
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
         if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
         callback('Invalid Application ID');
         }
         */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                    event.session,
                    (sessionAttributes, speechletResponse) => {
                callback(null, buildResponse(sessionAttributes, speechletResponse));
        });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                    event.session,
                    (sessionAttributes, speechletResponse) => {
                callback(null, buildResponse(sessionAttributes, speechletResponse));
        });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};

