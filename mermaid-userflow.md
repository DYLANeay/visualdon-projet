flowchart LR
    %% Définition des couleurs basées sur l'image
    classDef yellow fill:#FFF59D,stroke:#FBC02D,stroke-width:1px,color:#000
    classDef green fill:#A5D6A7,stroke:#388E3C,stroke-width:1px,color:#000
    classDef pink fill:#F48FB1,stroke:#C2185B,stroke-width:1px,color:#000
    classDef orange fill:#FFCC80,stroke:#F57C00,stroke-width:1px,color:#000

    %% --- DÉBUT DU FLUX (Gauche) ---
    N_Accueil["Page d'accueil"]:::yellow
    N_Scroll1["Scroll"]:::green
    N_Armees["Armées qui passent"]:::pink
    N_FinScroll["Fin du scroll"]:::green
    N_Scroll2["Scroll"]:::green
    N_Annees["Années qui passent"]:::pink

    N_Accueil --> N_Scroll1
    N_Scroll1 --> N_Armees
    N_Armees --> N_FinScroll
    N_FinScroll --> N_Scroll2
    N_Scroll2 --> N_Annees


    %% --- BRANCHE EUROPE (Milieu) ---
    N_Europe["Europe (map)"]:::orange
    N_Armees --> N_Europe

    N_Country["Country"]:::yellow
    N_Europe --> N_Country

    N_EvGen1["General Event"]:::yellow
    N_EvCH1["How switzerland is related ?"]:::yellow
    N_EvER1["Extreme right related event"]:::yellow

    N_Country --> N_EvGen1
    N_Country --> N_EvCH1
    N_Country --> N_EvER1

    N_Click1["Click"]:::green
    N_EvGen1 --> N_Click1
    N_EvCH1 --> N_Click1
    N_EvER1 --> N_Click1

    N_Spec1["Specific page (overlay) for the event"]:::orange
    N_Click1 --> N_Spec1

    N_Click2["Click"]:::green
    N_Spec1 --> N_Click2

    N_Wiki1["Wikipedia"]:::orange
    N_Click2 --> N_Wiki1
    
    %% Boucle de retour vers Europe (map)
    N_Click2 -->|Retour| N_Europe


    %% --- BRANCHE COUNTRY ZOOMED (Haut) ---
    N_ClickUp["Click"]:::green
    N_Europe --> N_ClickUp

    N_CountryZoom["Country (zoomed)"]:::orange
    N_ClickUp --> N_CountryZoom

    N_EvGen2["General Event"]:::yellow
    N_EvCH2["How switzerland is related ?"]:::yellow
    N_EvER2["Extreme right related event"]:::yellow

    N_CountryZoom --> N_EvGen2
    N_CountryZoom --> N_EvCH2
    N_CountryZoom --> N_EvER2

    N_Click3["Click"]:::green
    N_EvGen2 --> N_Click3
    N_EvCH2 --> N_Click3
    N_EvER2 --> N_Click3

    N_Spec2["Specific page (overlay) for the event"]:::orange
    N_Click3 --> N_Spec2

    N_Click4["Click"]:::green
    N_Spec2 --> N_Click4

    N_Wiki2["Wikipedia"]:::orange
    N_Click4 --> N_Wiki2

    %% Boucle de retour vers Country (zoomed)
    N_Click4 -->|Retour| N_CountryZoom


    %% --- BRANCHE SUISSE (Bas) ---
    N_CHMap["Switzerland (map)"]:::orange
    N_Annees --> N_CHMap

    N_CantonYellow["Canton"]:::yellow
    N_CHMap --> N_CantonYellow

    N_EvER3["Extreme right related event"]:::yellow
    N_CantonYellow --> N_EvER3

    N_Click5["Click"]:::green
    N_EvER3 --> N_Click5

    N_Spec3["Specific page (overlay) for the event"]:::orange
    N_Click5 --> N_Spec3

    N_Click6["Click"]:::green
    N_Spec3 --> N_Click6

    N_Nopa1["Nopasaran"]:::orange
    N_Click6 --> N_Nopa1

    %% Boucle de retour vers Switzerland (map)
    N_Click6 -->|Retour| N_CHMap


    %% --- BRANCHE CANTON ZOOMED (Tout en bas) ---
    N_ClickDown["Click"]:::green
    N_CantonYellow --> N_ClickDown

    N_CantonOrange["Canton"]:::orange
    N_ClickDown --> N_CantonOrange

    N_Parties["Parties distrib"]:::yellow
    N_Events["Events"]:::yellow
    N_GenInfo["General infos"]:::yellow
    N_UDC["UDC evol."]:::yellow

    N_CantonOrange --> N_Parties
    N_CantonOrange --> N_Events
    N_CantonOrange --> N_GenInfo
    N_CantonOrange --> N_UDC

    N_Click7["Click"]:::green
    N_Events --> N_Click7

    N_Spec4["Specific page (overlay) for the event"]:::orange
    N_Click7 --> N_Spec4

    N_Click8["Click"]:::green
    N_Spec4 --> N_Click8

    N_Nopa2["Nopasaran"]:::orange
    N_Click8 --> N_Nopa2
