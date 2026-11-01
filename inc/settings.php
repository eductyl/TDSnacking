<?php
// Réglages du restaurant : lus par le serveur (validation des commandes)
// ET envoyés au site par api/menu.php. Un seul endroit à modifier.
return [
    'timezone'           => 'Europe/Paris',
    'deliveryFee'        => 3.9,
    'deliveryMinimum'    => 25,
    'freeDeliveryFrom'   => 45,
    'prepMinutes'        => ['pickup' => 20, 'delivery' => 45],
    'advanceNoticeHours' => 24,

    // Horaires par jour : 0 = dimanche, 1 = lundi ... 6 = samedi.
    // Heures décimales (14.5 = 14h30). Un jour absent = fermé.
    'openingHours' => [
        0 => [[12, 15]],
        2 => [[12, 14.5], [19, 22]],
        3 => [[12, 14.5], [19, 22]],
        4 => [[12, 14.5], [19, 22]],
        5 => [[12, 14.5], [19, 23]],
        6 => [[12, 14.5], [19, 23]],
    ],

    'deliveryZone' => '[Communes ou codes postaux desservis]',

    // Passer à true une fois les allergènes validés par le restaurant
    'allergensVerified' => false,
];
