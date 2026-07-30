using LocalHire.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LocalHire.Api.Data;

public static class MockDataSeeder
{
    public const string DemoEmail = "demo@localhire.test";
    public const string DemoPassword = "LocalHire1!";

    private const int EmployerCount = 15;
    private const int WorkerCount = 35;
    private const int LegacyEmployerCount = 50;
    private const int LegacyWorkerCount = 1_000;
    private const int JobCount = 1_000;
    private const int ApplicationsPerJob = 10;

    private static readonly Guid DefaultEmployerId = new("11111111-1111-1111-1111-111111111111");
    private static readonly Guid DefaultWorkerId = new("22222222-2222-2222-2222-222222222222");
    private static readonly Guid StoreJobId = new("33333333-3333-3333-3333-333333333333");
    private static readonly Guid DeliveryJobId = new("44444444-4444-4444-4444-444444444444");
    private static readonly Guid DefaultApplicationId = new("55555555-5555-5555-5555-555555555555");
    private static readonly DateTimeOffset SeedTimestamp = new(2026, 7, 1, 12, 0, 0, TimeSpan.Zero);

    private static readonly EmploymentType[] EmploymentTypes = Enum.GetValues<EmploymentType>();
    private static readonly ApplicationStatus[] ApplicationStatuses = Enum.GetValues<ApplicationStatus>();

    private static readonly (string Area, string State, string Pincode, double Lat, double Lng, string Language)[] Locations =
    [
        ("Indiranagar, Bengaluru", "Karnataka", "560038", 12.9719, 77.6412, "Kannada"),
        ("Koramangala, Bengaluru", "Karnataka", "560034", 12.9352, 77.6245, "Kannada"),
        ("Andheri East, Mumbai", "Maharashtra", "400069", 19.1136, 72.8697, "Marathi"),
        ("Hinjawadi, Pune", "Maharashtra", "411057", 18.5913, 73.7389, "Marathi"),
        ("Connaught Place, New Delhi", "Delhi", "110001", 28.6315, 77.2167, "Hindi"),
        ("Hitech City, Hyderabad", "Telangana", "500081", 17.4435, 78.3772, "Telugu"),
        ("T Nagar, Chennai", "Tamil Nadu", "600017", 13.0418, 80.2341, "Tamil"),
        ("Salt Lake, Kolkata", "West Bengal", "700091", 22.5867, 88.4171, "Bengali"),
        ("Navrangpura, Ahmedabad", "Gujarat", "380009", 23.0365, 72.5611, "Gujarati"),
        ("Malviya Nagar, Jaipur", "Rajasthan", "302017", 26.8505, 75.8120, "Hindi")
    ];

    private static readonly (string Title, string Description, string[] Skills)[] Roles =
    [
        ("Store Associate", "Help customers, restock shelves, and handle counter billing.", ["Billing", "Customer service"]),
        ("Delivery Partner", "Deliver local orders and collect digital proof of delivery.", ["Two-wheeler licence", "Smartphone use"]),
        ("Cashier", "Operate the billing counter and reconcile daily payments.", ["Billing", "Basic maths"]),
        ("Warehouse Picker", "Pick, pack, and label customer orders accurately.", ["Inventory handling", "Packing"]),
        ("Security Guard", "Monitor the premises and maintain visitor records.", ["Observation", "Visitor management"]),
        ("Office Assistant", "Support filing, scheduling, and routine office work.", ["Document handling", "Computer basics"]),
        ("Customer Support Executive", "Resolve customer questions by phone and chat.", ["Communication", "Problem solving"]),
        ("Housekeeping Staff", "Keep guest and common areas clean and ready for use.", ["Cleaning", "Time management"]),
        ("Kitchen Helper", "Prepare ingredients and keep the kitchen work area clean.", ["Food preparation", "Hygiene"]),
        ("Cafe Server", "Take orders, serve guests, and maintain table areas.", ["Customer service", "Order taking"]),
        ("Driver", "Transport goods safely and maintain trip records.", ["Driving licence", "Route knowledge"]),
        ("Electrician", "Install and repair basic electrical systems on site.", ["Electrical repair", "Safety procedures"]),
        ("Plumber", "Install fixtures and resolve routine plumbing issues.", ["Pipe fitting", "Leak repair"]),
        ("Sales Associate", "Assist customers and meet daily store sales goals.", ["Sales", "Product knowledge"]),
        ("Data Entry Operator", "Enter and verify business records in internal systems.", ["Typing", "Attention to detail"]),
        ("Receptionist", "Welcome visitors and manage calls and appointments.", ["Communication", "Scheduling"]),
        ("Tailor", "Measure, alter, and finish garments to customer requirements.", ["Stitching", "Measurements"]),
        ("Machine Operator", "Operate production equipment and record output checks.", ["Machine operation", "Quality checks"]),
        ("Pharmacy Assistant", "Organize stock and support customers at the counter.", ["Stock handling", "Customer service"]),
        ("Field Technician", "Visit customer sites to install and service equipment.", ["Troubleshooting", "Field service"])
    ];

    private static readonly string[] WorkplaceNames =
    [
        "Fresh Basket", "QuickCart Hub", "CityCare Services", "Metro Mart", "BrightWorks",
        "Daily Needs", "Prime Support", "Urban Foods", "Reliable Trades", "Neighbourhood Store"
    ];

    private static readonly string[][] BenefitSets =
    [
        ["Provident Fund", "Meals"],
        ["Fuel allowance", "Accident insurance"],
        ["Paid leave", "Health insurance"],
        ["Performance bonus", "Uniform"]
    ];

    public static async Task SeedAsync(
        LocalHireDbContext database,
        CancellationToken cancellationToken = default)
    {
        var employerIds = Enumerable.Range(0, EmployerCount)
            .Select(index => index == 0 ? DefaultEmployerId : SeedId('e', index))
            .ToArray();
        var workerIds = Enumerable.Range(0, WorkerCount)
            .Select(index => index == 0 ? DefaultWorkerId : SeedId('d', index))
            .ToArray();
        var expectedUserIds = employerIds.Concat(workerIds).ToArray();
        var finalEmployerId = employerIds[EmployerCount - 1];
        var finalApplicationSequence = JobCount * ApplicationsPerJob - 1;
        var finalWorkerId = workerIds[finalApplicationSequence % WorkerCount];

        if (await database.JobPosts.AnyAsync(
                job => job.Id == JobId(JobCount - 1) && job.EmployerId == finalEmployerId,
                cancellationToken)
            && await database.JobApplications.AnyAsync(
                application => application.Id == SeedId('b', finalApplicationSequence)
                    && application.WorkerId == finalWorkerId,
                cancellationToken)
            && await database.Users.CountAsync(
                user => expectedUserIds.Contains(user.Id), cancellationToken) == expectedUserIds.Length
            && !await database.Users.AnyAsync(
                user => user.Id == SeedId('e', LegacyEmployerCount - 1)
                    || user.Id == SeedId('d', LegacyWorkerCount - 1),
                cancellationToken))
        {
            await database.JobApplications
                .Where(application => application.StatusUpdatedAt == null)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(
                        application => application.StatusUpdatedAt,
                        application => application.CreatedAt),
                    cancellationToken);
            return;
        }

        var now = SeedTimestamp;
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword, workFactor: 12);
        var users = new List<User>(EmployerCount + WorkerCount);
        await using var transaction = await database.Database.BeginTransactionAsync(cancellationToken);

        await database.Users
            .Where(user => user.Email == DemoEmail)
            .ExecuteDeleteAsync(cancellationToken);

        var legacyUserIds = new List<Guid>(LegacyEmployerCount + LegacyWorkerCount)
        {
            DefaultEmployerId,
            DefaultWorkerId
        };
        legacyUserIds.AddRange(Enumerable.Range(1, LegacyEmployerCount - 1)
            .Select(index => SeedId('e', index)));
        legacyUserIds.AddRange(Enumerable.Range(1, LegacyWorkerCount - 1)
            .Select(index => SeedId('d', index)));

        foreach (var ids in legacyUserIds.Chunk(500))
        {
            await database.Users
                .Where(user => ids.Contains(user.Id))
                .ExecuteDeleteAsync(cancellationToken);
        }

        var demoEmployer = CreateDemoEmployer(passwordHash, now);
        var demoWorker = CreateDemoWorker(passwordHash, now);
        users.AddRange(demoEmployer, demoWorker);

        for (var index = 1; index < EmployerCount; index++)
        {
            var location = Locations[index % Locations.Length];
            var employer = new User
            {
                Id = employerIds[index],
                Name = $"Local Employer {index:D3}",
                Email = $"employer{index:D3}@localhire.test",
                PasswordHash = passwordHash,
                Role = UserRole.Hiring,
                CityArea = location.Area,
                State = location.State,
                Pincode = location.Pincode,
                Latitude = location.Lat,
                Longitude = location.Lng,
                LocationUpdatedAt = now,
                CreatedAt = now.AddDays(-(index % 90))
            };
            users.Add(employer);
        }

        for (var index = 1; index < WorkerCount; index++)
        {
            var location = Locations[index % Locations.Length];
            var worker = new User
            {
                Id = workerIds[index],
                Name = $"Local Worker {index:D4}",
                Email = $"worker{index:D4}@localhire.test",
                PasswordHash = passwordHash,
                Role = UserRole.LookingForWork,
                DateOfBirth = new DateOnly(1985 + index % 20, 1 + index % 12, 1 + index % 28),
                JobTitle = Roles[index % Roles.Length].Title,
                CityArea = location.Area,
                State = location.State,
                Pincode = location.Pincode,
                Latitude = location.Lat,
                Longitude = location.Lng,
                LocationUpdatedAt = now,
                CreatedAt = now.AddDays(-(index % 365))
            };
            users.Add(worker);
        }

        database.Users.AddRange(users);

        var jobs = new List<JobPost>(JobCount);
        var jobIds = new Guid[JobCount];

        for (var index = 0; index < JobCount; index++)
        {
            var id = JobId(index);
            jobIds[index] = id;

            var employerIndex = index * EmployerCount / JobCount;
            jobs.Add(CreateJob(id, employerIds[employerIndex], employerIndex, index, now));
        }

        database.JobPosts.AddRange(jobs);

        var applications = new List<JobApplication>(JobCount * ApplicationsPerJob);

        for (var jobIndex = 0; jobIndex < JobCount; jobIndex++)
        {
            for (var applicationIndex = 0; applicationIndex < ApplicationsPerJob; applicationIndex++)
            {
                var sequence = jobIndex * ApplicationsPerJob + applicationIndex;
                var id = sequence == 0 ? DefaultApplicationId : SeedId('b', sequence);
                applications.Add(new JobApplication
                {
                    Id = id,
                    JobPostId = jobIds[jobIndex],
                    WorkerId = workerIds[sequence % WorkerCount],
                    WorkerRole = UserRole.LookingForWork,
                    Status = ApplicationStatuses[(jobIndex + applicationIndex) % ApplicationStatuses.Length],
                    CreatedAt = now.AddMinutes(-sequence),
                    StatusUpdatedAt = now.AddMinutes(-sequence)
                });
            }
        }

        database.JobApplications.AddRange(applications);
        await database.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private static User CreateDemoEmployer(string passwordHash, DateTimeOffset now) => new()
    {
        Id = DefaultEmployerId,
        Name = "Demo Employer",
        Email = DemoEmail,
        PasswordHash = passwordHash,
        Role = UserRole.Hiring,
        Phone = "+91 98765 43210",
        AddressLine = "100 Feet Road",
        CityArea = Locations[0].Area,
        State = Locations[0].State,
        Pincode = Locations[0].Pincode,
        Latitude = Locations[0].Lat,
        Longitude = Locations[0].Lng,
        LocationUpdatedAt = now,
        CreatedAt = now.AddDays(-30)
    };

    private static User CreateDemoWorker(string passwordHash, DateTimeOffset now) => new()
    {
        Id = DefaultWorkerId,
        Name = "Demo Worker",
        Email = DemoEmail,
        PasswordHash = passwordHash,
        Role = UserRole.LookingForWork,
        Phone = "+91 98765 43211",
        DateOfBirth = new DateOnly(1998, 6, 15),
        JobTitle = "Delivery Partner",
        CityArea = Locations[1].Area,
        State = Locations[1].State,
        Pincode = Locations[1].Pincode,
        Latitude = Locations[1].Lat,
        Longitude = Locations[1].Lng,
        LocationUpdatedAt = now,
        CreatedAt = now.AddDays(-20)
    };

    private static JobPost CreateJob(
        Guid id,
        Guid employerId,
        int employerIndex,
        int jobIndex,
        DateTimeOffset now)
    {
        var role = Roles[jobIndex % Roles.Length];
        var location = Locations[jobIndex % Locations.Length];
        var salaryMin = 16_000 + jobIndex % 8 * 1_500;
        var experienceMin = jobIndex % 3;

        return new JobPost
        {
            Id = id,
            EmployerId = employerId,
            EmployerRole = UserRole.Hiring,
            Title = role.Title,
            Description = role.Description,
            WorkplaceName = $"{WorkplaceNames[employerIndex % WorkplaceNames.Length]} {employerIndex + 1:D2}",
            CityArea = location.Area,
            State = location.State,
            Pincode = location.Pincode,
            Latitude = location.Lat,
            Longitude = location.Lng,
            EmploymentType = EmploymentTypes[jobIndex % EmploymentTypes.Length],
            SalaryMin = salaryMin,
            SalaryMax = salaryMin + 5_000,
            SalaryPeriod = SalaryPeriod.Monthly,
            MinEducation = jobIndex % 4 == 0 ? "No formal education" : "10th pass",
            ExperienceMinYears = experienceMin,
            ExperienceMaxYears = experienceMin + 2,
            WorkingDays = jobIndex % 2 == 0 ? "Mon-Sat" : "6 days/week",
            ShiftStartTime = new TimeOnly(8 + jobIndex % 3, 0),
            ShiftEndTime = new TimeOnly(17 + jobIndex % 3, 0),
            Openings = 1 + jobIndex % 8,
            RequiredSkills = [.. role.Skills],
            Languages = location.Language == "Hindi"
                ? ["Hindi", "English"]
                : [location.Language, "Hindi"],
            Benefits = [.. BenefitSets[jobIndex % BenefitSets.Length]],
            IsActive = jobIndex % 12 != 0,
            CreatedAt = now.AddMinutes(-(jobIndex * 30))
        };
    }

    private static Guid SeedId(char category, int index) =>
        new($"{category}0000000-0000-0000-0000-{index:x12}");

    private static Guid JobId(int index) => index switch
    {
        0 => StoreJobId,
        1 => DeliveryJobId,
        _ => SeedId('c', index)
    };
}
